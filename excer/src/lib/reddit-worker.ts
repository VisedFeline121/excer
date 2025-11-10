import axios from 'axios';
import { kvStore } from './kv';

// Target subreddits for penny stock discussions
const SUBREDDITS = [
  'pennystocks',
  'wallstreetbets', 
  '10xPennyStocks',
  'SmallStreetBets'
];

// Stock symbol regex pattern (2-5 letters, with optional $ prefix)
const STOCK_SYMBOL_REGEX = /(?:^|\s|\$)([A-Z]{2,5})\b(?![\w\d])/g;

// Sentiment keywords
const POSITIVE_KEYWORDS = [
  'moon', 'rocket', 'breakout', 'squeeze', 'catalyst', 'bullish', 'pump',
  'explosive', 'gains', 'profit', 'buy', 'long', 'hodl', 'diamond hands'
];

const NEGATIVE_KEYWORDS = [
  'dump', 'crash', 'avoid', 'scam', 'bearish', 'sell', 'short', 'paper hands',
  'loss', 'bag', 'pump and dump', 'manipulation'
];

interface RedditComment {
  id: string;
  body: string;
  score: number;
  created_utc: number;
  author: string;
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
  author: string;
  comments: RedditComment[];
}

interface UserSentiment {
  userId: string;        // Reddit username
  sentiment: 'positive' | 'negative' | 'neutral';
  timestamp: number;     // When they expressed this sentiment
  score: number;         // Post/comment score (indicates community agreement)
  source: {             // Where this sentiment came from
    type: 'post' | 'comment';
    id: string;         // Post/comment ID
    text: string;       // The actual content
  };
}

interface StockData {
  symbol: string;
  mentions: number;
  uniquePosts: number;
  uniqueUsers: number;
  userSentiments: UserSentiment[];
  sentimentScore: number;  // Calculated from userSentiments
  posts: RedditPost[];
  lastUpdated: number;
}

interface WorkerData {
  stocks: StockData[];
  lastUpdated: number;
  totalSubreddits: number;
  dataSource: 'reddit' | 'error';
}

class RedditWorker {
  constructor() {
    // No initialization needed for KV store
  }

  // Fetch posts from a subreddit
  private async fetchComments(permalink: string, postTitle: string): Promise<RedditComment[]> {
    try {
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await this.fetchWithRetry(`https://www.reddit.com${permalink}.json`);

      // Reddit returns an array with post data and comments data
      const commentsData = response.data[1].data.children;
      
      // Get top 3 comments that mention the stock
      const stockSymbol = postTitle.toUpperCase().match(/\$?([A-Z]{2,5})\b/)?.[1];
      const comments: RedditComment[] = commentsData
        .filter((child: { kind: string, data: any }) => {
          // Must be a comment (not a "more comments" link)
          if (child.kind !== 't1') return false;
          
          // Must have positive score
          if (child.data.score <= 0) return false;
          
          // Must mention the stock symbol
          const commentText = child.data.body.toUpperCase();
          return stockSymbol && (
            commentText.includes(`$${stockSymbol}`) ||
            commentText.includes(` ${stockSymbol} `) ||
            commentText.includes(`${stockSymbol},`) ||
            commentText.includes(`${stockSymbol}.`) ||
            commentText.includes(`${stockSymbol}!`) ||
            commentText.includes(`${stockSymbol}?`)
          );
        })
        .map((child: { data: any }) => ({
          id: child.data.id,
          body: child.data.body || '',
          score: child.data.score,
          created_utc: child.data.created_utc,
          author: child.data.author
        }))
        // Sort by score and take top 3 relevant comments
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 3);

      console.log(`Found ${comments.length} comments for post`);
      return comments;
    } catch (error: any) {
      console.error(`Error fetching comments:`, error);
      return [];
    }
  }

  private async fetchWithRetry(url: string, retries = 5, delay = 10000): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'ExcerStockTracker/1.0',
            'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`
          },
          timeout: 15000
        });
        return response;
      } catch (error: any) {
        if (error.response?.status === 429) {
          console.log(`Rate limited, waiting ${delay/1000} seconds before retry ${i + 1}/${retries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Increase delay for next retry
          delay *= 2;
          continue;
        }
        throw error;
      }
    }
    throw new Error(`Failed after ${retries} retries`);
  }

  private async fetchSubredditPosts(subreddit: string): Promise<RedditPost[]> {
    try {
      console.log(`Fetching posts from r/${subreddit}...`);
      
      // Use Reddit's public JSON API with retry mechanism
      // Get both new and top posts from last week
      const response = await this.fetchWithRetry(`https://www.reddit.com/r/${subreddit}/new.json?limit=50`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between requests
      const topResponse = await this.fetchWithRetry(`https://www.reddit.com/r/${subreddit}/top.json?limit=50&t=week`);

      // Combine and deduplicate posts from both sources
      const allChildren = [
        ...response.data.data.children,
        ...topResponse.data.data.children
      ];
      
      // Remove duplicate posts by ID
      const seenIds = new Set<string>();
      const uniqueChildren = allChildren.filter(child => {
        if (seenIds.has(child.data.id)) return false;
        seenIds.add(child.data.id);
        return true;
      });

      console.log(`Found ${uniqueChildren.length} unique posts from ${allChildren.length} total in r/${subreddit}`);

      const posts = await Promise.all(uniqueChildren.map(async (child: { data: any }) => {
        const post = {
          id: child.data.id,
          title: child.data.title,
          selftext: child.data.selftext || '',
          score: child.data.score,
          created_utc: child.data.created_utc,
          subreddit: child.data.subreddit,
          permalink: child.data.permalink,
          author: child.data.author,
          comments: [] as RedditComment[]
        };

        // Only process high-quality stock mentions in title
        const title = post.title.toUpperCase();
        
        // Post must have decent engagement
        const hasEngagement = child.data.score >= 10;
        
        // Look for explicit stock mentions in title
        const hasStockSymbol = (
          // $TICK format (most reliable)
          title.match(/\$[A-Z]{2,5}\b/) ||
          // "TICK stock/share" format
          title.match(/\b[A-Z]{2,5}\s+(?:STOCK|SHARE|TICKER)S?\b/) ||
          // "stock/share TICK" format
          title.match(/\b(?:STOCK|SHARE|TICKER)S?\s+[A-Z]{2,5}\b/)
        ) && hasEngagement; // Must have minimum score
        
        if (hasStockSymbol) {
          post.comments = await this.fetchComments(post.permalink, post.title);
        }

        return post;
      }));

      console.log(`Found ${posts.length} posts in r/${subreddit} (${uniqueChildren.length} unique from ${allChildren.length} total)`);
      if (posts.length > 0) {
        console.log(`Sample post titles:`, posts.slice(0, 3).map(p => p.title));
      }
      
      return posts;
    } catch (error: any) {
      console.error(`Error fetching from r/${subreddit}:`, error);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }
      return [];
      } finally {
        // Add a longer delay between subreddits to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
  }

  // Validate stock symbol using TradingView API
  private async validateStockSymbol(symbol: string): Promise<boolean> {
    try {
      // Try multiple exchanges to be more comprehensive
      const exchanges = ['NASDAQ', 'NYSE', 'AMEX', 'OTC'];
      
      for (const exchange of exchanges) {
        try {
          const response = await axios.get(
            `https://symbol-search.tradingview.com/symbol_search/?text=${symbol}&exchange=${exchange}`,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              },
              timeout: 3000
            }
          );
          
          // Check if we get valid results
          if (response.data && response.data.length > 0) {
            // Additional check: make sure the symbol matches exactly
            const exactMatch = response.data.some((item: any) => 
              item.symbol === symbol || 
              item.symbol === `$${symbol}` ||
              item.symbol === `${symbol}:${exchange}`
            );
            
            if (exactMatch) {
              console.log(`Symbol ${symbol} validated on ${exchange}`);
              return true;
            }
          }
        } catch (exchangeError) {
          // Continue to next exchange
          continue;
        }
      }
      
      console.log(`Symbol ${symbol} NOT found on any major exchange`);
      return false;
    } catch (error: any) {
      console.log(`Symbol validation failed for ${symbol}, assuming invalid:`, error.message);
      // If API fails, assume invalid to be more conservative
      return false;
    }
  }

  // Deduplicate posts by ID
  private deduplicatePosts(posts: RedditPost[]): RedditPost[] {
    const seen = new Set<string>();
    return posts.filter(post => {
      if (seen.has(post.id)) {
        console.log(`Removing duplicate post: ${post.title} (ID: ${post.id})`);
        return false;
      }
      seen.add(post.id);
      return true;
    });
  }

  // Process posts for stock mentions and sentiment
  private async processPostsForStocks(posts: RedditPost[]): Promise<{ [key: string]: StockData }> {
    const stockData: { [key: string]: StockData } = {};
    let totalMatches = 0;

      posts.forEach((post: RedditPost) => {
        // Only look for stock symbols in the title
        const title = post.title;
        
        // Find potential stock symbols in title using the improved regex
        const regexMatches = [...title.matchAll(STOCK_SYMBOL_REGEX)];
        const matches = regexMatches.map(match => match[1]); // Extract the captured group
        
        // Also look for common stock mention patterns in title
        const tickerMatches = title.toLowerCase().match(/\$[a-z]{2,5}\b/g) || [];  // $ticker
        const tickerWordMatches = title.toLowerCase().match(/\b(?:ticker|stock|share)s?\s+([a-z]{2,5})\b/gi) || []; // "ticker ABC"
        
        const allMatches = [
          ...matches,
          ...tickerMatches.map(m => m.toUpperCase()),
          ...tickerWordMatches.map(m => m.split(/\s+/).pop()?.toUpperCase() || '')
        ].filter(Boolean);
      
      if (allMatches.length > 0) {
        console.log(`Found potential stock symbols in post: "${post.title}" - matches:`, allMatches);
        totalMatches += allMatches.length;
        
        // Process symbols with validation
        for (const match of allMatches) {
          const symbol = match.replace(/^\$/, '').toUpperCase();
          
          // Skip common false positives and very short/long symbols
          const FALSE_POSITIVES = [
            // Common English words (2-5 letters)
            'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'HAD', 'WHAT', 'WERE', 'WHEN', 'YOUR', 'HOW', 'SAID', 'EACH', 'WHICH', 'THEIR', 'TIME', 'WILL', 'ABOUT', 'IF', 'UP', 'OUT', 'MANY', 'THEN', 'THEM', 'THESE', 'SO', 'SOME', 'WOULD', 'MAKE', 'LIKE', 'INTO', 'HIM', 'HAS', 'MORE', 'GO', 'NO', 'WAY', 'COULD', 'MY', 'THAN', 'FIRST', 'BEEN', 'CALL', 'WHO', 'ITS', 'NOW', 'FIND', 'LONG', 'DOWN', 'DAY', 'DID', 'GET', 'COME', 'MADE', 'MAY', 'PART', 'NEW', 'WORK', 'USE', 'MAN', 'FIND', 'GIVE', 'JUST', 'WHERE', 'MOST', 'GOOD', 'MUCH', 'SOME', 'TIME', 'VERY', 'WHEN', 'COME', 'HERE', 'JUST', 'LIKE', 'LONG', 'MAKE', 'MANY', 'OVER', 'SUCH', 'TAKE', 'THAN', 'THEM', 'WELL', 'WERE', 'TODAY',
            // Business/Finance Terms
            'CEO', 'CFO', 'COO', 'CTO', 'CMO', 'CRO', 'CCO', 'CDO', 'CIO', 'CLO', 'CPO',
            'IPO', 'ICO', 'SPO', 'APO', 'ETF', 'REIT', 'SPAC',
            'EPS', 'P2E', 'PEG', 'ROI', 'ROE', 'ROA', 'IRR', 'NPV', 'DCF',
            'SEC', 'FDA', 'EPA', 'DOJ', 'FTC', 'IRS', 'IMF', 'FED',
            'AI', 'ML', 'AR', 'VR', 'IoT', 'SaaS', 'PaaS', 'IaaS',
            'DD', 'TA', 'FA', 'SI', 'DCA', 'FOMO', 'FUD', 'ASDAQ', 'PRICE', 'PVOTE', 'FULL', 
            'POST', 'OCKED', 'WEEK', 'LLING', 'UEEZE', 'LINE', 'PANIC', 'VEGAN', 'CKING', 'EYOND', 
            'ARKET', 'STILL', 'HODL', 'COUNT', 'READ', 'LIFE', 'SHO', 'LDERS', 'TRONG', 'PENED',
            // Tech/Business Common Words
              'API', 'SDK', 'UI', 'UX', 'QA', 'PM', 'HR', 'PR', 'IT', 'IS', 'TO', 'YOLO', 'TLDR',
              // Common Business Terms
              'INC', 'LLC', 'LTD', 'CORP', 'CO', 'HOLDINGS', 'GROUP', 'INTL', 'TECH', 'GAAP',
              'YTD', 'EOD', 'ROW', 'QTD', 'MTD', 'FY', 'CY', 'EST', 'PDT', 'GMT',
              'PURE', 'WORTH', 'HAVE', 'WITH', 'INESS', 'HIVE', 'NEXT', 'LAST', 'BEST',
              'FREE', 'PAID', 'CALL', 'PUT', 'BID', 'ASK', 'NET', 'GROSS', 'TOTAL', 'CHAT', 'CROWD',
              'BACK', 'ONLY', 'KNOW', 'WHY', 'APES',
            // Common Prepositions/Articles/Conjunctions
            'IN', 'ON', 'AT', 'BY', 'OF', 'OR', 'AN', 'AS', 'BE', 'DO', 'IF', 'SO', 'UP', 'VS',
            // Common Verbs
            'AM', 'IS', 'ARE', 'WAS', 'WERE', 'BE', 'BEEN', 'GO', 'GOES', 'WENT',
            'DO', 'DOES', 'DID', 'DONE', 'SEE', 'SEEN', 'SAW', 'GET', 'GOT', 'HOLD', 'BUY', 'SELL',
            // Common Adjectives
            'BIG', 'BAD', 'LOW', 'HIGH', 'HOT', 'COLD', 'FAST', 'SLOW', 'GOOD',
            // Common Pronouns
            'HE', 'SHE', 'IT', 'WE', 'YOU', 'THEY', 'WHO', 'WHAT', 'THIS', 'THAT',
            // Additional Common Words (3-4 letters)
            'CAT', 'DOG', 'CAR', 'BUS', 'TRAIN', 'PLANE', 'SHIP', 'BOAT', 'BIKE',
            'HOME', 'HOUSE', 'ROOM', 'DOOR', 'WINDOW', 'TABLE', 'CHAIR', 'BED',
            'FOOD', 'WATER', 'MILK', 'BREAD', 'MEAT', 'FISH', 'CHICKEN',
            'BOOK', 'PEN', 'PAPER', 'PHONE', 'COMPUTER', 'LAPTOP', 'TV',
            'MONEY', 'CASH', 'CARD', 'BANK', 'SHOP', 'STORE', 'MALL',
            'GAME', 'PLAY', 'FUN', 'HAPPY', 'SAD', 'MAD', 'TIRED', 'SICK',
            'FRIEND', 'FAMILY', 'MOTHER', 'FATHER', 'BROTHER', 'SISTER',
            'SCHOOL', 'TEACHER', 'STUDENT', 'CLASS', 'TEST', 'EXAM',
            'JOB', 'WORK', 'BOSS', 'EMPLOYEE', 'OFFICE', 'MEETING',
            'HEALTH', 'DOCTOR', 'HOSPITAL', 'MEDICINE', 'PILL',
            'SPORT', 'FOOTBALL', 'BASKETBALL', 'TENNIS', 'GOLF',
            'MUSIC', 'SONG', 'MOVIE', 'FILM', 'SHOW', 'PARTY',
            'TRAVEL', 'VACATION', 'HOTEL', 'RESTAURANT', 'COFFEE',
            'WEATHER', 'SUN', 'RAIN', 'SNOW', 'WIND', 'CLOUD',
            'COLOR', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE',
            'NUMBER', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
            // Common Abbreviations
            'USA', 'UK', 'EU', 'UN', 'NATO', 'WHO', 'UNESCO', 'NASA', 'FBI', 'CIA', 'MOON',
            'TV', 'PC', 'CD', 'DVD', 'USB', 'GPS', 'WiFi', 'HTML', 'CSS', 'JS',
            'AM', 'PM', 'AD', 'BC', 'ETC', 'EG', 'IE', 'VS', 'AKA', 'FYI',
            // Common Acronyms
            'OK', 'OKAY', 'YES', 'NO', 'YES', 'NO', 'OK', 'OKAY',
            'LOL', 'OMG', 'WTF', 'BTW', 'FYI', 'ASAP', 'RSVP', 'VIP', 'USD',
            // Common Contractions and Short Forms
            'DONT', 'WONT', 'CANT', 'SHOULDNT', 'WOULDNT', 'COULDNT',
            'IM', 'YOURE', 'HES', 'SHES', 'ITS', 'WERE', 'THEYRE',
            'IVE', 'YOUVE', 'WEVE', 'THEYVE', 'HASNT', 'HAVENT'
          ];
          
          if (symbol.length < 2 || symbol.length > 5 || FALSE_POSITIVES.includes(symbol)) {
            console.log(`Skipping symbol: ${symbol} (false positive)`);
            continue;
          }
          
          // Skip validation for now to avoid API rate limits
          // TODO: Implement post-processing validation
          
          console.log(`Processing stock symbol: ${symbol}`);
          
          if (!stockData[symbol]) {
            stockData[symbol] = {
              symbol,
              mentions: 0,
              uniquePosts: 0,
              uniqueUsers: 0,
              userSentiments: [],
              sentimentScore: 0,
              posts: [],
              lastUpdated: Date.now()
            };
          }
          
          stockData[symbol].mentions++;
          stockData[symbol].posts.push(post);
          
          // Calculate sentiment for text
          const analyzeText = (text: string): { sentiment: 'positive' | 'negative' | 'neutral', positiveCount: number, negativeCount: number } => {
            const positiveCount = POSITIVE_KEYWORDS.filter(keyword => text.includes(keyword)).length;
            const negativeCount = NEGATIVE_KEYWORDS.filter(keyword => text.includes(keyword)).length;
            return {
              sentiment: positiveCount > negativeCount ? 'positive' as const : 
                        negativeCount > positiveCount ? 'negative' as const : 'neutral' as const,
              positiveCount,
              negativeCount
            };
          };

          // Analyze post content (title and selftext)
          const postContent = `${post.title}\n${post.selftext}`.toLowerCase();
          const postAnalysis = analyzeText(postContent);
          
          // Post sentiment has 2x weight because it's the main content
          const postSentiment: UserSentiment = {
            userId: post.author,
            sentiment: postAnalysis.sentiment,
            timestamp: post.created_utc,
            score: post.score * 2, // Double weight for post
            source: {
              type: 'post',
              id: post.id,
              text: postContent
            }
          };
          
          // Get top 5 comments by score and analyze their sentiment
          const commentSentiments: UserSentiment[] = post.comments
            .sort((a, b) => b.score - a.score) // Sort by score
            .slice(0, 5) // Take top 5
            .map(comment => {
              const commentAnalysis = analyzeText(comment.body.toLowerCase());
              return {
                userId: comment.author,
                sentiment: commentAnalysis.sentiment,
                timestamp: comment.created_utc,
                score: comment.score,
                source: {
                  type: 'comment',
                  id: comment.id,
                  text: comment.body
                }
              };
            });

          // Combine all sentiments
          stockData[symbol].userSentiments.push(postSentiment, ...commentSentiments);
          
          // Update unique users count
          const uniqueUsers = new Set(stockData[symbol].userSentiments.map(s => s.userId));
          stockData[symbol].uniqueUsers = uniqueUsers.size;
          
          // Calculate weighted sentiment score
          const weightedSentiments = stockData[symbol].userSentiments.map(s => ({
            sentiment: s.sentiment === 'positive' ? 1 : s.sentiment === 'negative' ? -1 : 0,
            weight: Math.log10(Math.max(s.score, 1)) + 1  // Log scale for scores
          }));
          
          const totalWeight = weightedSentiments.reduce((sum, s) => sum + s.weight, 0);
          stockData[symbol].sentimentScore = totalWeight > 0 
            ? weightedSentiments.reduce((sum, s) => sum + (s.sentiment * s.weight), 0) / totalWeight
            : 0;
        }
      }
    });

    console.log(`Total potential stock matches found: ${totalMatches}`);
    console.log(`Valid stock symbols processed: ${Object.keys(stockData).length}`);
    
    return stockData;
  }

  // Save data to KV store
  private async saveData(data: WorkerData): Promise<void> {
    try {
      // Clear old data first to stay within memory limits
      await kvStore.del('stocks');
      
      // Save new data
      await kvStore.set('stocks', data);
      console.log('Data saved to KV store');
    } catch (error) {
      console.error('Error saving data:', error);
      throw error; // Re-throw to handle in worker
    }
  }

  // Load data from KV store
  public async loadData(): Promise<WorkerData | null> {
    try {
      console.log('[Worker] Reading from KV store');
      const data = await kvStore.get('stocks');
      console.log('[Worker] Successfully loaded data:', {
        stocksCount: data?.stocks?.length || 0,
        lastUpdated: data?.lastUpdated ? new Date(data.lastUpdated).toISOString() : 'none',
        firstStock: data?.stocks?.[0]?.symbol || 'none'
      });
      return data;
    } catch (error) {
      console.log('[Worker] No existing data found:', error);
      return null;
    }
  }

  // Main worker function
  public async run(): Promise<void> {
    console.log('Starting Reddit worker...');
    
    try {
      const allStockData: { [key: string]: StockData } = {};
      
      // Fetch from all subreddits
      for (const subreddit of SUBREDDITS) {
        console.log(`Fetching from r/${subreddit}...`);
        const posts = await this.fetchSubredditPosts(subreddit);
        const stockData = await this.processPostsForStocks(posts);
        
        // Merge stock data
        Object.keys(stockData).forEach(symbol => {
          if (allStockData[symbol]) {
            allStockData[symbol].mentions += stockData[symbol].mentions;
            
            // Merge posts and deduplicate by ID
            const combinedPosts = [...allStockData[symbol].posts, ...stockData[symbol].posts];
            allStockData[symbol].posts = this.deduplicatePosts(combinedPosts);
            // Update uniquePosts count after deduplication
            allStockData[symbol].uniquePosts = allStockData[symbol].posts.length;
          } else {
            allStockData[symbol] = stockData[symbol];
            // Set uniquePosts for new stocks
            allStockData[symbol].uniquePosts = allStockData[symbol].posts.length;
          }
        });
        
        // Small delay between subreddits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Final deduplication pass for all stocks
      Object.keys(allStockData).forEach(symbol => {
        allStockData[symbol].posts = this.deduplicatePosts(allStockData[symbol].posts);
        allStockData[symbol].uniquePosts = allStockData[symbol].posts.length;
        console.log(`Final deduplication for ${symbol}: ${allStockData[symbol].uniquePosts} unique posts, ${allStockData[symbol].mentions} total mentions`);
      });

      // Remove known invalid symbols that TradingView doesn't recognize
      const invalidSymbols = ['US', 'UK', 'EU', 'CA', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'CH', 'AT', 'BE', 'IE', 'PT', 'GR', 'PL', 'CZ', 'HU', 'SK', 'SI', 'HR', 'BG', 'RO', 'LT', 'LV', 'EE', 'CY', 'MT', 'LU'];
      invalidSymbols.forEach(symbol => {
        if (allStockData[symbol]) {
          console.log(`Removing invalid symbol: ${symbol}`);
          delete allStockData[symbol];
        }
      });

      // Calculate sentiment scores and sort by trending
      const stocks = Object.values(allStockData)
        // Include ALL stocks with at least one real post
        .filter(stock => stock.posts.length > 0)
        .map(stock => {
          // Calculate post engagement score
          const postScore = stock.posts.reduce((sum, p) => sum + Math.max(p.score, 1), 0);
          const avgScore = postScore / stock.posts.length;
          
          // Calculate sentiment
          const sentimentScore = stock.userSentiments.reduce((sum, s) => {
            const sentiment = s.sentiment === 'positive' ? 1 : s.sentiment === 'negative' ? -1 : 0;
            const weight = Math.log10(Math.max(s.score, 1)) + 1;
            return sum + (sentiment * weight);
          }, 0);
          
          // Calculate trending score components
          // Heavily weight unique posts and engagement
          const diversityScore = stock.uniquePosts * 3;        // More weight on unique posts
          const mentionScore = stock.mentions * 0.5;          // Less weight on raw mentions
          const engagementScore = Math.log10(avgScore + 1) * 2; // More weight on high-scoring posts
          const sentimentImpact = Math.abs(sentimentScore);    // Keep sentiment as is
          
          const trendingScore = diversityScore + mentionScore + engagementScore + sentimentImpact;
          
          return {
            ...stock,
            sentimentScore,
            trendingScore
          };
        })
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 20); // Top 20 trending stocks
      
      const workerData: WorkerData = {
        stocks,
        lastUpdated: Date.now(),
        totalSubreddits: SUBREDDITS.length,
        dataSource: 'reddit'
      };
      
      await this.saveData(workerData);
      console.log(`Worker completed. Found ${stocks.length} trending stocks.`);
      
    } catch (error) {
      console.error('Worker error:', error);
      
      // Save error state
      const errorData: WorkerData = {
        stocks: [],
        lastUpdated: Date.now(),
        totalSubreddits: SUBREDDITS.length,
        dataSource: 'error'
      };
      
      await this.saveData(errorData);
    }
  }
}

export default RedditWorker;
