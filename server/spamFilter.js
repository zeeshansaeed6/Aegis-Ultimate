/**
 * Aegis SEO Spam & Content Farm Filter
 * Cleans search results of known scrapers, Pinterest walls, clickbait farms, and user-blocked domains.
 */

const DEFAULT_BLOCKED_DOMAINS = new Set([
  'pinterest.com',
  'pinterest.co.uk',
  'quora.com',
  'answers.com',
  'expertvillage.com',
  'ehow.com',
  'softonic.com',
  'cnet.com/download',
  'geeksforgeeks.org/spam'
]);

class SpamFilter {
  constructor() {
    this.customBlocked = new Set();
  }

  addDomain(domain) {
    if (!domain) return;
    const clean = domain.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
    this.customBlocked.add(clean);
  }

  removeDomain(domain) {
    if (!domain) return;
    const clean = domain.trim().toLowerCase();
    this.customBlocked.delete(clean);
  }

  getAllBlocked(userList = []) {
    const combined = new Set([...DEFAULT_BLOCKED_DOMAINS, ...this.customBlocked]);
    if (Array.isArray(userList)) {
      userList.forEach(d => {
        if (d) combined.add(d.trim().toLowerCase());
      });
    }
    return Array.from(combined);
  }

  isDomainBlocked(domain, userList = []) {
    if (!domain) return false;
    const cleanDomain = domain.toLowerCase();
    const blockedList = this.getAllBlocked(userList);

    return blockedList.some(b => cleanDomain === b || cleanDomain.endsWith('.' + b));
  }

  filterResults(results, userList = []) {
    if (!Array.isArray(results)) return { filtered: [], blockedCount: 0 };

    let blockedCount = 0;
    const filtered = results.filter(item => {
      let domain = item.domain;
      if (!domain && item.url) {
        try {
          domain = new URL(item.url).hostname;
        } catch (e) {}
      }

      const blocked = this.isDomainBlocked(domain, userList);
      if (blocked) {
        blockedCount++;
        return false;
      }
      return true;
    });

    return {
      filtered,
      blockedCount
    };
  }
}

const spamFilter = new SpamFilter();

module.exports = {
  spamFilter,
  SpamFilter,
  DEFAULT_BLOCKED_DOMAINS
};
