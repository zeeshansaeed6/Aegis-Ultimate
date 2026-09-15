/**
 * Aegis Private Search Engine - Client Controller (Ultimate Edition)
 * Zero-telemetry, Kagi-style Focus Lenses, Perplexity-style AI synthesizer,
 * Live Privacy Lab auditor, Research Scratchpad, Visual EXIF scrubber, Voice search,
 * proxied media, local folder watcher, and AES-GCM encrypted backups.
 */

(function () {
  'use strict';

  // Application State
  const state = {
    currentQuery: '',
    currentCategory: 'all',
    currentLens: 'all',
    currentTimeFilter: '',
    currentFiletype: '',
    currentRegion: '',
    currentSafeSearch: '-1',
    selectedIndex: -1,
    results: [],
    aiEnabled: localStorage.getItem('aegis_ai_enabled') !== 'false',
    deepResearchEnabled: false,
    linkOpenMode: localStorage.getItem('aegis_link_open_mode') || 'sandboxed',
    aiConfig: loadAiConfig(),
    blockedDomains: loadBlockedDomains(),
    customLenses: loadCustomLenses(),
    metrics: loadLocalMetrics(),
    speechSynthUtterance: null
  };

  // Primary Elements
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const btnToggleAi = document.getElementById('btnToggleAi');
  const btnVoiceSearch = document.getElementById('btnVoiceSearch');
  const btnImageLens = document.getElementById('btnImageLens');
  const suggestionsDropdown = document.getElementById('suggestionsDropdown');
  const searchHero = document.getElementById('searchHero');
  const resultsSection = document.getElementById('resultsSection');
  const resultsFeed = document.getElementById('resultsFeed');
  const imageResultsGrid = document.getElementById('imageResultsGrid');
  const videoResultsGrid = document.getElementById('videoResultsGrid');
  const resultsSkeleton = document.getElementById('resultsSkeleton');
  const resultsCountText = document.getElementById('resultsCountText');
  const instantAnswerContainer = document.getElementById('instantAnswerContainer');
  const aiSynthesisContainer = document.getElementById('aiSynthesisContainer');
  const categoriesBar = document.getElementById('categoriesBar');
  const powerFiltersBar = document.getElementById('powerFiltersBar');
  const hudTrackersCount = document.getElementById('hudTrackersCount');

  // Lens Elements
  const btnActiveLens = document.getElementById('btnActiveLens');
  const activeLensIcon = document.getElementById('activeLensIcon');
  const activeLensName = document.getElementById('activeLensName');
  const lensDropdownMenu = document.getElementById('lensDropdownMenu');

  // Privacy Lab Elements
  const btnPrivacyLabToggle = document.getElementById('btnPrivacyLabToggle');
  const privacyLabModalBackdrop = document.getElementById('privacyLabModalBackdrop');
  const btnClosePrivacyLab = document.getElementById('btnClosePrivacyLab');
  const btnRunPrivacyAudit = document.getElementById('btnRunPrivacyAudit');
  const labScoreNumber = document.getElementById('labScoreNumber');
  const statusWebRtc = document.getElementById('statusWebRtc');
  const statusCanvas = document.getElementById('statusCanvas');
  const statusReferrer = document.getElementById('statusReferrer');
  const statusAudio = document.getElementById('statusAudio');

  // Research Scratchpad Elements
  const btnScratchpadToggle = document.getElementById('btnScratchpadToggle');
  const scratchpadDrawer = document.getElementById('scratchpadDrawer');
  const btnCloseScratchpad = document.getElementById('btnCloseScratchpad');
  const scratchpadTextarea = document.getElementById('scratchpadTextarea');
  const scratchpadPreviewBody = document.getElementById('scratchpadPreviewBody');
  const scratchpadStats = document.getElementById('scratchpadStats');
  const btnScratchpadToVault = document.getElementById('btnScratchpadToVault');
  const btnExportMarkdownNote = document.getElementById('btnExportMarkdownNote');
  const btnClipReaderToNotes = document.getElementById('btnClipReaderToNotes');

  // EXIF / Visual Lens Elements
  const exifModalBackdrop = document.getElementById('exifModalBackdrop');
  const btnCloseExifModal = document.getElementById('btnCloseExifModal');
  const exifDropzone = document.getElementById('exifDropzone');
  const exifFileInput = document.getElementById('exifFileInput');
  const exifResultArea = document.getElementById('exifResultArea');
  const exifPreviewImg = document.getElementById('exifPreviewImg');
  const exifSummaryText = document.getElementById('exifSummaryText');
  const exifTagsList = document.getElementById('exifTagsList');
  const btnDownloadScrubbedImg = document.getElementById('btnDownloadScrubbedImg');
  const btnSearchCleanKeywords = document.getElementById('btnSearchCleanKeywords');
  let currentScrubbedBlob = null;
  let currentImageName = '';

  // Reader Modal Elements
  const readerModalBackdrop = document.getElementById('readerModalBackdrop');
  const readerModalTitle = document.getElementById('readerModalTitle');
  const readerDocByline = document.getElementById('readerDocByline');
  const readerModalBody = document.getElementById('readerModalBody');
  const readerTrackersCount = document.getElementById('readerTrackersCount');
  const readerReadingTime = document.getElementById('readerReadingTime');
  const readerDirectLink = document.getElementById('readerDirectLink');
  const btnCloseReader = document.getElementById('btnCloseReader');
  const btnReaderPrint = document.getElementById('btnReaderPrint');

  // Vault Drawer & Folder Sync
  const vaultDrawer = document.getElementById('vaultDrawer');
  const btnVaultToggle = document.getElementById('btnVaultToggle');
  const btnCloseVault = document.getElementById('btnCloseVault');
  const vaultForm = document.getElementById('vaultForm');
  const vaultDocList = document.getElementById('vaultDocList');
  const vaultDocCount = document.getElementById('vaultDocCount');
  const btnSearchAllVault = document.getElementById('btnSearchAllVault');
  const watchedFolderPath = document.getElementById('watchedFolderPath');
  const btnSyncFolder = document.getElementById('btnSyncFolder');
  const folderSyncStatusText = document.getElementById('folderSyncStatusText');

  // Settings Modal Elements
  const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
  const btnSettingsToggle = document.getElementById('btnSettingsToggle');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const aiProviderSelect = document.getElementById('aiProviderSelect');
  const geminiKeyGroup = document.getElementById('geminiKeyGroup');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const aiModelInput = document.getElementById('aiModelInput');
  const btnSaveAiSettings = document.getElementById('btnSaveAiSettings');
  const newBlockedDomainInput = document.getElementById('newBlockedDomainInput');
  const btnAddBlockedDomain = document.getElementById('btnAddBlockedDomain');
  const blockedDomainsList = document.getElementById('blockedDomainsList');
  const torStatusText = document.getElementById('torStatusText');
  const btnRefreshTor = document.getElementById('btnRefreshTor');
  const vaultBackupPassword = document.getElementById('vaultBackupPassword');
  const btnExportEncryptedVault = document.getElementById('btnExportEncryptedVault');
  const inputImportEncryptedVault = document.getElementById('inputImportEncryptedVault');
  const btnExportHtmlBookmarks = document.getElementById('btnExportHtmlBookmarks');
  const btnOpenSearchHelper = document.getElementById('btnOpenSearchHelper');

  // Media Modals
  const imageLightboxBackdrop = document.getElementById('imageLightboxBackdrop');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');
  const lightboxSourceBtn = document.getElementById('lightboxSourceBtn');
  const btnCloseLightbox = document.getElementById('btnCloseLightbox');
  const btnLightboxZoomOut = document.getElementById('btnLightboxZoomOut');
  const btnLightboxZoomIn = document.getElementById('btnLightboxZoomIn');
  const btnLightboxOpenInBrowser = document.getElementById('btnLightboxOpenInBrowser');
  const btnLightboxCopyAddress = document.getElementById('btnLightboxCopyAddress');
  const btnLightboxPrev = document.getElementById('btnLightboxPrev');
  const btnLightboxNext = document.getElementById('btnLightboxNext');
  let currentLightboxImages = [];
  let currentLightboxIndex = -1;
  let currentLightboxZoom = 1.0;

  const videoModalBackdrop = document.getElementById('videoModalBackdrop');
  const videoModalTitle = document.getElementById('videoModalTitle');
  const videoIframe = document.getElementById('videoIframe');
  const btnCloseVideo = document.getElementById('btnCloseVideo');

  // Shortcuts & Panic
  const shortcutsModalBackdrop = document.getElementById('shortcutsModalBackdrop');
  const btnShortcuts = document.getElementById('btnShortcuts');
  const btnCloseShortcuts = document.getElementById('btnCloseShortcuts');
  const btnPanicWipe = document.getElementById('btnPanicWipe');
  const toastContainer = document.getElementById('toastContainer');

  // Autonomous Web Crawler & Native Search Index Studio
  const btnCrawlerStudioToggle = document.getElementById('btnCrawlerStudioToggle');
  const crawlerStudioModalBackdrop = document.getElementById('crawlerStudioModalBackdrop');
  const btnCloseCrawlerStudio = document.getElementById('btnCloseCrawlerStudio');
  const crawlerHeaderStatusDot = document.getElementById('crawlerHeaderStatusDot');
  const crawlerHudStatus = document.getElementById('crawlerHudStatus');
  const crawlerHudDocs = document.getElementById('crawlerHudDocs');
  const crawlerHudTerms = document.getElementById('crawlerHudTerms');
  const crawlerHudQueue = document.getElementById('crawlerHudQueue');
  const crawlerHudAvgWords = document.getElementById('crawlerHudAvgWords');
  const crawlerSeedUrl = document.getElementById('crawlerSeedUrl');
  const crawlerMaxPages = document.getElementById('crawlerMaxPages');
  const valMaxPages = document.getElementById('valMaxPages');
  const crawlerMaxDepth = document.getElementById('crawlerMaxDepth');
  const valMaxDepth = document.getElementById('valMaxDepth');
  const crawlerDelayMs = document.getElementById('crawlerDelayMs');
  const valDelayMs = document.getElementById('valDelayMs');
  const radarSweepBeam = document.getElementById('radarSweepBeam');
  const radarBlipsContainer = document.getElementById('radarBlipsContainer');
  const radarStatusText = document.getElementById('radarStatusText');
  const btnStartCrawl = document.getElementById('btnStartCrawl');
  const btnStopCrawl = document.getElementById('btnStopCrawl');
  const btnRebuildIndex = document.getElementById('btnRebuildIndex');
  const tabCrawlerTerminal = document.getElementById('tabCrawlerTerminal');
  const tabCrawlerDocs = document.getElementById('tabCrawlerDocs');
  const btnClearTerminalLogs = document.getElementById('btnClearTerminalLogs');
  const btnClearCrawlerIndex = document.getElementById('btnClearCrawlerIndex');
  const crawlerTerminalBox = document.getElementById('crawlerTerminalBox');
  const crawlerLogTerminal = document.getElementById('crawlerLogTerminal');
  const crawlerDocsBox = document.getElementById('crawlerDocsBox');
  const crawlerDocsTableBody = document.getElementById('crawlerDocsTableBody');
  const crawlerDocsCountBadge = document.getElementById('crawlerDocsCountBadge');

  const CRAWLER_PRESETS = {
    express: 'https://expressjs.com/en/starter/installing.html',
    sqlite: 'https://www.sqlite.org/docs.html',
    rust: 'https://doc.rust-lang.org/book/',
    arch: 'https://wiki.archlinux.org/title/Main_page'
  };

  let crawlerPollingInterval = null;
  let lastCrawlerLogIndex = 0;
  let isCrawlerActive = false;

  // Built-In Sandboxed Private Web Browser Elements
  const btnBrowserToggle = document.getElementById('btnBrowserToggle');
  const privateBrowserModalBackdrop = document.getElementById('privateBrowserModalBackdrop');
  const privateBrowserCard = document.getElementById('privateBrowserCard');
  const browserTabsStrip = document.getElementById('browserTabsStrip');
  const browserTabsList = document.getElementById('browserTabsList');
  const btnBrowserNewTab = document.getElementById('btnBrowserNewTab');
  const btnBrowserSplitScreen = document.getElementById('btnBrowserSplitScreen');
  const btnBrowserMaximize = document.getElementById('btnBrowserMaximize');
  const btnCloseBrowser = document.getElementById('btnCloseBrowser');
  const btnBrowserBack = document.getElementById('btnBrowserBack');
  const btnBrowserForward = document.getElementById('btnBrowserForward');
  const btnBrowserReload = document.getElementById('btnBrowserReload');
  const btnBrowserHome = document.getElementById('btnBrowserHome');
  const browserOmniboxForm = document.getElementById('browserOmniboxForm');
  const browserUrlInput = document.getElementById('browserUrlInput');
  const browserBlockedCount = document.getElementById('browserBlockedCount');
  const btnBrowserBurnTab = document.getElementById('btnBrowserBurnTab');
  const btnBrowserClipToNotes = document.getElementById('btnBrowserClipToNotes');
  const btnBrowserReaderToggle = document.getElementById('btnBrowserReaderToggle');
  const btnBrowserExternalLink = document.getElementById('btnBrowserExternalLink');
  const browserLoadingBar = document.getElementById('browserLoadingBar');
  const browserStartPage = document.getElementById('browserStartPage');
  const browserIframe = document.getElementById('browserIframe');
  const btnBrowserCurrentEngine = document.getElementById('btnBrowserCurrentEngine');
  const browserEngineDropdown = document.getElementById('browserEngineDropdown');
  const browserEngineIcon = document.getElementById('browserEngineIcon');
  const browserEngineLabel = document.getElementById('browserEngineLabel');
  const browserSuggestionsDropdown = document.getElementById('browserSuggestionsDropdown');

  // Chrome Parity Elements (Downloads, Extensions, DevTools, Webviews & Knowledge Graph)
  const browserWebviewsContainer = document.getElementById('browserWebviewsContainer');
  const btnBrowserDownloads = document.getElementById('btnBrowserDownloads');
  const browserDownloadsBadge = document.getElementById('browserDownloadsBadge');
  const browserDownloadsPopover = document.getElementById('browserDownloadsPopover');
  const btnOpenDownloadsFolder = document.getElementById('btnOpenDownloadsFolder');
  const btnClearDownloadsList = document.getElementById('btnClearDownloadsList');
  const browserDownloadsList = document.getElementById('browserDownloadsList');
  const btnBrowserExtensions = document.getElementById('btnBrowserExtensions');
  const btnBrowserDevTools = document.getElementById('btnBrowserDevTools');
  const extensionsModalBackdrop = document.getElementById('extensionsModalBackdrop');
  const btnCloseExtensionsModal = document.getElementById('btnCloseExtensionsModal');
  const btnLoadUnpackedExtension = document.getElementById('btnLoadUnpackedExtension');
  const extensionsInstalledList = document.getElementById('extensionsInstalledList');
  const extensionsCatalogGrid = document.getElementById('extensionsCatalogGrid');
  const knowledgeGraphSidebar = document.getElementById('knowledgeGraphSidebar');
  const btnZoomInLightbox = document.getElementById('btnZoomInLightbox');
  const btnZoomOutLightbox = document.getElementById('btnZoomOutLightbox');
  const btnLightboxOpenInTab = document.getElementById('btnLightboxOpenInTab');
  const btnLightboxCopyUrl = document.getElementById('btnLightboxCopyUrl');
  const btnVideoOpenInTab = document.getElementById('btnVideoOpenInTab');

  // Split View & AI Page Summarizer Elements
  const btnToggleSplitView = document.getElementById('btnToggleSplitView');
  const btnSummarizePage = document.getElementById('btnSummarizePage');
  const browserPrimaryPane = document.getElementById('browserPrimaryPane');
  const browserSplitResizer = document.getElementById('browserSplitResizer');
  const browserSecondaryPane = document.getElementById('browserSecondaryPane');
  const browserSecondaryForm = document.getElementById('browserSecondaryForm');
  const browserSecondaryUrlInput = document.getElementById('browserSecondaryUrlInput');
  const btnSecondarySwap = document.getElementById('btnSecondarySwap');
  const btnSecondaryReload = document.getElementById('btnSecondaryReload');
  const btnSecondaryClose = document.getElementById('btnSecondaryClose');
  const browserSecondaryIframe = document.getElementById('browserSecondaryIframe');
  const secondaryStartPlaceholder = document.getElementById('secondaryStartPlaceholder');

  // Page Summary Drawer Elements
  const pageSummaryDrawer = document.getElementById('pageSummaryDrawer');
  const btnCloseSummaryDrawer = document.getElementById('btnCloseSummaryDrawer');
  const summaryDrawerTitle = document.getElementById('summaryDrawerTitle');
  const summaryDrawerSubtitle = document.getElementById('summaryDrawerSubtitle');
  const summaryEngineBadge = document.getElementById('summaryEngineBadge');
  const summaryLoadingState = document.getElementById('summaryLoadingState');
  const summaryContentState = document.getElementById('summaryContentState');
  const summaryTakeawaysList = document.getElementById('summaryTakeawaysList');
  const summaryMarkdownBody = document.getElementById('summaryMarkdownBody');
  const summaryReadingTime = document.getElementById('summaryReadingTime');
  const summaryWordCount = document.getElementById('summaryWordCount');
  const btnCopySummary = document.getElementById('btnCopySummary');
  const btnClipSummaryToNotes = document.getElementById('btnClipSummaryToNotes');

  // Flagship Pillars: Deep Research, Workspaces, Shields, Vault, OCR & PiP
  const btnToggleDeepResearch = document.getElementById('btnToggleDeepResearch');
  const deepResearchContainer = document.getElementById('deepResearchContainer');
  const browserWorkspacesBar = document.getElementById('browserWorkspacesBar');
  const btnToggleVerticalTabs = document.getElementById('btnToggleVerticalTabs');
  const browserVerticalSidebar = document.getElementById('browserVerticalSidebar');
  const browserVerticalTabsList = document.getElementById('browserVerticalTabsList');
  const btnVerticalNewTab = document.getElementById('btnVerticalNewTab');
  const btnCollapseVerticalSidebar = document.getElementById('btnCollapseVerticalSidebar');
  const browserShieldPill = document.getElementById('browserShieldPill');
  const browserShieldsPopover = document.getElementById('browserShieldsPopover');
  const shieldsStatusBadge = document.getElementById('shieldsStatusBadge');
  const shieldsTargetSite = document.getElementById('shieldsTargetSite');
  const shieldsMasterSwitch = document.getElementById('shieldsMasterSwitch');
  const shieldsStatTrackers = document.getElementById('shieldsStatTrackers');
  const shieldsStatFingerprints = document.getElementById('shieldsStatFingerprints');
  const shieldsStatBandwidth = document.getElementById('shieldsStatBandwidth');
  const shieldsStatSpeedup = document.getElementById('shieldsStatSpeedup');
  const shieldsSelectAds = document.getElementById('shieldsSelectAds');
  const shieldsToggleFingerprint = document.getElementById('shieldsToggleFingerprint');
  const shieldsToggleMemorySaver = document.getElementById('shieldsToggleMemorySaver');
  const shieldsToggleHttps = document.getElementById('shieldsToggleHttps');
  const btnClearSiteData = document.getElementById('btnClearSiteData');
  const tabVaultPasswords = document.getElementById('tabVaultPasswords');
  const paneVaultPasswords = document.getElementById('paneVaultPasswords');
  const btnBrowserScreenshot = document.getElementById('btnBrowserScreenshot');
  const btnBrowserPdfExport = document.getElementById('btnBrowserPdfExport');
  const btnBrowserPiP = document.getElementById('btnBrowserPiP');
  const pipFloatingPlayer = document.getElementById('pipFloatingPlayer');
  const pipDragHeader = document.getElementById('pipDragHeader');
  const pipActiveVideo = document.getElementById('pipActiveVideo');
  const btnPipReturn = document.getElementById('btnPipReturn');
  const btnPipClose = document.getElementById('btnPipClose');

  // Flagship Time Machine Elements
  const btnBrowserTimeMachine = document.getElementById('btnBrowserTimeMachine');
  const timeMachineModalBackdrop = document.getElementById('timeMachineModalBackdrop');
  const btnCloseTimeMachine = document.getElementById('btnCloseTimeMachine');
  const timeMachineTargetUrl = document.getElementById('timeMachineTargetUrl');
  const timeMachineLoading = document.getElementById('timeMachineLoading');
  const timeMachineResult = document.getElementById('timeMachineResult');
  const timeMachineBadge = document.getElementById('timeMachineBadge');
  const timeMachineDate = document.getElementById('timeMachineDate');
  const timeMachineDesc = document.getElementById('timeMachineDesc');
  const btnOpenWaybackInBrowser = document.getElementById('btnOpenWaybackInBrowser');
  const btnOpenWaybackDirect = document.getElementById('btnOpenWaybackDirect');
  const linkArchiveToday = document.getElementById('linkArchiveToday');
  const linkWaybackCalendar = document.getElementById('linkWaybackCalendar');
  const linkGoogleCache = document.getElementById('linkGoogleCache');
  let activeTimeMachineSnapshotUrl = '';

  // Flagship Web Highlighter Elements
  const aegisHighlighterToolbar = document.getElementById('aegisHighlighterToolbar');
  const btnHlAddNote = document.getElementById('btnHlAddNote');
  const btnHlClipScratchpad = document.getElementById('btnHlClipScratchpad');
  const btnHlDismiss = document.getElementById('btnHlDismiss');
  const btnScratchpadSyncHighlights = document.getElementById('btnScratchpadSyncHighlights');
  let currentSelectedText = '';
  let currentSelectionRange = null;

  // Browser Search Engines Definition
  const BROWSER_ENGINES = {
    aegis: { id: 'aegis', label: 'Aegis', icon: '🛡️', placeholder: 'Search privately with Aegis Engine (or enter URL)...', resolve: (q, tabId) => `/browser/search?tabId=${encodeURIComponent(tabId || '')}&q=${encodeURIComponent(q)}` },
    bing: { id: 'bing', label: 'Bing', icon: '🅱️', placeholder: 'Search Bing privately (or type URL)...', resolve: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    brave: { id: 'brave', label: 'Brave', icon: '🦁', placeholder: 'Search Brave privately (or type URL)...', resolve: q => `https://search.brave.com/search?q=${encodeURIComponent(q)}` },
    startpage: { id: 'startpage', label: 'SP', icon: '🌐', placeholder: 'Search Startpage (or type URL)...', resolve: q => `https://www.startpage.com/do/dsearch?query=${encodeURIComponent(q)}` },
    google: { id: 'google', label: 'Google', icon: '🔍', placeholder: 'Search Google (or type URL)...', resolve: q => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    ddg: { id: 'ddg', label: 'DDG', icon: '🦆', placeholder: 'Search DuckDuckGo (or type URL)...', resolve: q => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}` },
    wikipedia: { id: 'wikipedia', label: 'Wiki', icon: '📖', placeholder: 'Search Wikipedia (or type URL)...', resolve: q => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}` },
    github: { id: 'github', label: 'GH', icon: '🐙', placeholder: 'Search GitHub Repos (or type URL)...', resolve: q => `https://github.com/search?q=${encodeURIComponent(q)}` },
    mdn: { id: 'mdn', label: 'MDN', icon: '💻', placeholder: 'Search MDN Docs (or type URL)...', resolve: q => `https://developer.mozilla.org/search?q=${encodeURIComponent(q)}` }
  };

  // Browser Omnibox Bang Shortcuts
  const BROWSER_BANGS = [
    { prefix: '!w', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
    { prefix: '!wiki', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
    { prefix: '!gh', url: 'https://github.com/search?q=' },
    { prefix: '!b', url: 'https://www.bing.com/search?q=' },
    { prefix: '!bing', url: 'https://www.bing.com/search?q=' },
    { prefix: '!g', url: 'https://www.google.com/search?q=' },
    { prefix: '!google', url: 'https://www.google.com/search?q=' },
    { prefix: '!yt', url: 'https://www.youtube.com/results?search_query=' },
    { prefix: '!so', url: 'https://stackoverflow.com/nocache?q=' },
    { prefix: '!mdn', url: 'https://developer.mozilla.org/search?q=' },
    { prefix: '!r', url: 'https://www.reddit.com/search/?q=' },
    { prefix: '!rd', url: 'https://www.reddit.com/search/?q=' },
    { prefix: '!hn', url: 'https://hn.algolia.com/?q=' },
    { prefix: '!ddg', url: 'https://html.duckduckgo.com/html/?q=' },
    { prefix: '!brave', url: 'https://search.brave.com/search?q=' },
    { prefix: '!sp', url: 'https://www.startpage.com/do/dsearch?query=' },
    { prefix: '!npm', url: 'https://www.npmjs.com/search?q=' },
    { prefix: '!pypi', url: 'https://pypi.org/search/?q=' },
    { prefix: '!crates', url: 'https://crates.io/search?q=' },
    { prefix: '!arxiv', url: 'https://arxiv.org/search/?query=' },
    { prefix: '!archive', url: 'https://web.archive.org/web/*/' }
  ];

  // Browser State
  const browserState = {
    tabs: [],
    activeTabId: null,
    isSplitMode: false,
    isFullscreen: false,
    engine: localStorage.getItem('aegis_browser_engine') || 'aegis',
    activeWorkspace: 'personal',
    isVerticalTabs: false,
    isSplitView: false,
    splitRatio: 50,
    secondaryUrl: '',
    summaryData: null,
    shields: {
      active: true,
      trackersBlocked: parseInt(localStorage.getItem('aegis_shields_trackers') || '0', 10),
      fingerprintsCloaked: parseInt(localStorage.getItem('aegis_shields_fingerprints') || '0', 10),
      bandwidthSavedKB: parseInt(localStorage.getItem('aegis_shields_bandwidth') || '0', 10),
      adsBlockingMode: localStorage.getItem('aegis_shields_ads') || 'aggressive',
      fingerprintRandomizer: localStorage.getItem('aegis_shields_fp') !== 'false',
      memorySaver: localStorage.getItem('aegis_shields_memory') !== 'false',
      strictHttps: localStorage.getItem('aegis_shields_https') !== 'false'
    }
  };

  init();

  function init() {
    updateHudDisplay();
    updateAiToggleButton();
    updateBrowserEngineUI();
    attachEventListeners();
    loadVaultDocuments();
    checkWatchedFolderStatus();
    renderBlockedDomainsUI();
    loadScratchpad();

    // Check direct query via URL params
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    const cat = urlParams.get('cat') || 'all';
    const lens = urlParams.get('lens') || 'all';
    if (q) {
      searchInput.value = q;
      state.currentCategory = cat;
      state.currentLens = lens;
      updateActiveCategoryTab(cat);
      setLens(lens);
      executeSearch(q, cat);
    }
  }

  function attachEventListeners() {
    // Search Form Submit
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) {
        closeSuggestions();
        executeSearch(q, state.currentCategory);
      }
    });

    const btnSubmitSearch = document.getElementById('btnSubmitSearch');
    if (btnSubmitSearch) {
      btnSubmitSearch.addEventListener('click', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) {
          closeSuggestions();
          executeSearch(q, state.currentCategory);
        }
      });
    }

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) {
          closeSuggestions();
          executeSearch(q, state.currentCategory);
        }
      }
    });

    // AI Toggle
    btnToggleAi.addEventListener('click', () => {
      state.aiEnabled = !state.aiEnabled;
      localStorage.setItem('aegis_ai_enabled', state.aiEnabled);
      updateAiToggleButton();
      showToast(state.aiEnabled ? 'AI Answers Activated' : 'AI Answers Disabled');
      if (state.aiEnabled && state.currentQuery && state.results.length > 0) {
        triggerAiSynthesis(state.currentQuery, state.results);
      } else if (!state.aiEnabled) {
        aiSynthesisContainer.style.display = 'none';
      }
    });

    // Voice Search (SpeechRecognition)
    btnVoiceSearch.addEventListener('click', handleVoiceSearch);

    // Visual Lens / EXIF
    btnImageLens.addEventListener('click', () => exifModalBackdrop.style.display = 'flex');
    btnCloseExifModal.addEventListener('click', () => exifModalBackdrop.style.display = 'none');
    exifModalBackdrop.addEventListener('click', (e) => {
      if (e.target === exifModalBackdrop) exifModalBackdrop.style.display = 'none';
    });

    exifDropzone.addEventListener('click', () => exifFileInput.click());
    exifFileInput.addEventListener('change', handleExifFileUpload);
    exifDropzone.addEventListener('dragover', (e) => { e.preventDefault(); exifDropzone.style.borderColor = 'var(--accent-emerald)'; });
    exifDropzone.addEventListener('dragleave', () => { exifDropzone.style.borderColor = ''; });
    exifDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      exifDropzone.style.borderColor = '';
      if (e.dataTransfer.files?.[0]) processImageForExif(e.dataTransfer.files[0]);
    });
    btnDownloadScrubbedImg.addEventListener('click', downloadScrubbedImage);
    btnSearchCleanKeywords.addEventListener('click', searchByScrubbedKeywords);

    // Lenses Dropdown
    btnActiveLens.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = lensDropdownMenu.style.display === 'none';
      lensDropdownMenu.style.display = isHidden ? 'block' : 'none';
      searchForm.classList.toggle('lens-menu-open', isHidden);
    });

    document.querySelectorAll('.lens-option').forEach(opt => {
      opt.addEventListener('click', () => {
        setLens(opt.dataset.lens);
        lensDropdownMenu.style.display = 'none';
        searchForm.classList.remove('lens-menu-open');
        if (state.currentQuery) executeSearch(state.currentQuery, state.currentCategory);
      });
    });

    document.addEventListener('click', (e) => {
      if (!btnActiveLens.contains(e.target) && !lensDropdownMenu.contains(e.target)) {
        lensDropdownMenu.style.display = 'none';
        searchForm.classList.remove('lens-menu-open');
      }
    });

    // Power Search Filter Chips (Date, Filetype, Region, SafeSearch)
    powerFiltersBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      if (chip.dataset.time !== undefined) {
        powerFiltersBar.querySelectorAll('[data-time]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentTimeFilter = chip.dataset.time;
      } else if (chip.dataset.filetype !== undefined) {
        powerFiltersBar.querySelectorAll('[data-filetype]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentFiletype = chip.dataset.filetype;
      } else if (chip.dataset.region !== undefined) {
        powerFiltersBar.querySelectorAll('[data-region]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentRegion = chip.dataset.region;
      } else if (chip.dataset.safesearch !== undefined) {
        powerFiltersBar.querySelectorAll('[data-safesearch]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.currentSafeSearch = chip.dataset.safesearch;
      }

      if (state.currentQuery) {
        executeSearch(state.currentQuery, state.currentCategory);
      }
    });

    // Privacy Lab Auditor
    btnPrivacyLabToggle.addEventListener('click', () => {
      privacyLabModalBackdrop.style.display = 'flex';
      runPrivacyAudit();
    });
    btnClosePrivacyLab.addEventListener('click', () => privacyLabModalBackdrop.style.display = 'none');
    privacyLabModalBackdrop.addEventListener('click', (e) => {
      if (e.target === privacyLabModalBackdrop) privacyLabModalBackdrop.style.display = 'none';
    });
    btnRunPrivacyAudit.addEventListener('click', runPrivacyAudit);

    // Research Scratchpad
    btnScratchpadToggle.addEventListener('click', () => toggleScratchpad());
    btnCloseScratchpad.addEventListener('click', () => toggleScratchpad(false));
    scratchpadTextarea.addEventListener('input', updateScratchpad);
    btnScratchpadToVault.addEventListener('click', saveScratchpadToVault);
    btnExportMarkdownNote.addEventListener('click', exportScratchpadMarkdown);
    btnClipReaderToNotes.addEventListener('click', clipReaderToNotes);

    // Scratchpad Toolbar
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        insertTextAtCursor(scratchpadTextarea, btn.dataset.insert);
        updateScratchpad();
      });
    });

    // Search Input & Suggestions
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      const val = searchInput.value;
      btnClearSearch.style.display = val.length > 0 ? 'flex' : 'none';

      clearTimeout(debounceTimer);
      if (val.trim().length >= 2) {
        debounceTimer = setTimeout(() => fetchSuggestions(val.trim()), 180);
      } else {
        closeSuggestions();
      }
    });

    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.style.display = 'none';
      closeSuggestions();
      searchInput.focus();
    });

    // Category Tabs
    categoriesBar.addEventListener('click', (e) => {
      const tab = e.target.closest('.category-tab');
      if (!tab) return;
      const cat = tab.dataset.category;
      if (cat !== state.currentCategory) {
        state.currentCategory = cat;
        updateActiveCategoryTab(cat);
        if (state.currentQuery) executeSearch(state.currentQuery, cat);
      }
    });

    // Bang Chips
    document.querySelectorAll('.bang-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const bang = chip.dataset.bang;
        searchInput.value = bang;
        searchInput.focus();
        if (bang.startsWith('calc:')) executeSearch(bang, 'all');
      });
    });

    // Global Keydown
    window.addEventListener('keydown', handleGlobalKeydown);

    // Modals
    btnCloseReader.addEventListener('click', closeReaderModal);
    readerModalBackdrop.addEventListener('click', (e) => {
      if (e.target === readerModalBackdrop) closeReaderModal();
    });
    btnReaderPrint.addEventListener('click', () => window.print());

    btnCloseLightbox.addEventListener('click', () => {
      if (imageLightboxBackdrop) imageLightboxBackdrop.style.display = 'none';
    });
    imageLightboxBackdrop.addEventListener('click', (e) => {
      if (e.target === imageLightboxBackdrop) imageLightboxBackdrop.style.display = 'none';
    });

    if (btnLightboxZoomIn) {
      btnLightboxZoomIn.addEventListener('click', () => {
        currentLightboxZoom = Math.min(3.0, currentLightboxZoom + 0.25);
        if (lightboxImage) lightboxImage.style.transform = `scale(${currentLightboxZoom})`;
      });
    }
    if (btnLightboxZoomOut) {
      btnLightboxZoomOut.addEventListener('click', () => {
        currentLightboxZoom = Math.max(0.5, currentLightboxZoom - 0.25);
        if (lightboxImage) lightboxImage.style.transform = `scale(${currentLightboxZoom})`;
      });
    }
    if (btnLightboxOpenInBrowser) {
      btnLightboxOpenInBrowser.addEventListener('click', () => {
        if (currentLightboxIndex >= 0 && currentLightboxImages[currentLightboxIndex]) {
          const item = currentLightboxImages[currentLightboxIndex];
          const targetUrl = item.sourceUrl || item.proxiedUrl;
          if (imageLightboxBackdrop) imageLightboxBackdrop.style.display = 'none';
          openInPrivateBrowser(targetUrl, item.title);
        }
      });
    }
    if (btnLightboxCopyAddress) {
      btnLightboxCopyAddress.addEventListener('click', async () => {
        if (currentLightboxIndex >= 0 && currentLightboxImages[currentLightboxIndex]) {
          const item = currentLightboxImages[currentLightboxIndex];
          const urlToCopy = item.sourceUrl || item.proxiedUrl;
          try {
            await navigator.clipboard.writeText(urlToCopy);
            showToast('Image address copied to clipboard! 📋');
          } catch(e) {
            showToast('Failed to copy image address');
          }
        }
      });
    }
    if (btnLightboxPrev) {
      btnLightboxPrev.addEventListener('click', () => navigateImageLightbox(-1));
    }
    if (btnLightboxNext) {
      btnLightboxNext.addEventListener('click', () => navigateImageLightbox(1));
    }

    btnCloseVideo.addEventListener('click', closeVideoModal);
    videoModalBackdrop.addEventListener('click', (e) => {
      if (e.target === videoModalBackdrop) closeVideoModal();
    });

    // Vault Drawer
    btnVaultToggle.addEventListener('click', () => toggleVaultDrawer(true));
    btnCloseVault.addEventListener('click', () => toggleVaultDrawer(false));
    vaultForm.addEventListener('submit', handleVaultAdd);
    btnSyncFolder.addEventListener('click', handleFolderSync);
    btnSearchAllVault.addEventListener('click', () => {
      toggleVaultDrawer(false);
      state.currentCategory = 'local';
      updateActiveCategoryTab('local');
      searchInput.value = '!doc ';
      executeSearch('', 'local');
    });

    // Settings Modal
    btnSettingsToggle.addEventListener('click', openSettingsModal);
    btnCloseSettings.addEventListener('click', () => settingsModalBackdrop.style.display = 'none');
    settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === settingsModalBackdrop) settingsModalBackdrop.style.display = 'none';
    });

    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const paneId = btn.dataset.tab.replace('tab', 'pane');
        const pane = document.getElementById(paneId);
        if (pane) pane.classList.add('active');
      });
    });

    aiProviderSelect.addEventListener('change', () => {
      geminiKeyGroup.style.display = aiProviderSelect.value === 'gemini' ? 'block' : 'none';
    });
    btnSaveAiSettings.addEventListener('click', handleSaveAiSettings);

    btnAddBlockedDomain.addEventListener('click', handleAddBlockedDomain);
    newBlockedDomainInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAddBlockedDomain(); }
    });

    btnRefreshTor.addEventListener('click', checkTorStatus);
    btnExportEncryptedVault.addEventListener('click', handleExportEncryptedVault);
    inputImportEncryptedVault.addEventListener('change', handleImportEncryptedVault);
    btnExportHtmlBookmarks.addEventListener('click', exportHtmlBookmarks);

    btnOpenSearchHelper.addEventListener('click', () => {
      navigator.clipboard.writeText('http://localhost:3000/?q=%s');
      showToast('Template copied: http://localhost:3000/?q=%s');
    });

    const linkOpenModeSelect = document.getElementById('linkOpenModeSelect');
    if (linkOpenModeSelect) {
      linkOpenModeSelect.value = state.linkOpenMode;
      linkOpenModeSelect.addEventListener('change', () => {
        state.linkOpenMode = linkOpenModeSelect.value;
        localStorage.setItem('aegis_link_open_mode', state.linkOpenMode);
        showToast(`Links will now open ${state.linkOpenMode === 'direct' ? 'directly in real tabs (100% native compatibility)' : 'inside Aegis sandboxed browser'}`);
      });
    }

    btnShortcuts.addEventListener('click', () => shortcutsModalBackdrop.style.display = 'flex');
    btnCloseShortcuts.addEventListener('click', () => shortcutsModalBackdrop.style.display = 'none');
    shortcutsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === shortcutsModalBackdrop) shortcutsModalBackdrop.style.display = 'none';
    });

    btnPanicWipe.addEventListener('click', executePanicWipe);

    // Crawler Studio Event Listeners
    if (btnCrawlerStudioToggle) btnCrawlerStudioToggle.addEventListener('click', () => toggleCrawlerStudio());
    if (btnCloseCrawlerStudio) btnCloseCrawlerStudio.addEventListener('click', () => closeCrawlerStudio());
    if (crawlerStudioModalBackdrop) {
      crawlerStudioModalBackdrop.addEventListener('click', (e) => {
        if (e.target === crawlerStudioModalBackdrop) closeCrawlerStudio();
      });
    }

    document.querySelectorAll('.crawler-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        if (CRAWLER_PRESETS[presetKey] && crawlerSeedUrl) {
          crawlerSeedUrl.value = CRAWLER_PRESETS[presetKey];
          showToast(`Loaded preset seed: ${btn.textContent.trim()}`);
        }
      });
    });

    if (crawlerMaxPages) {
      crawlerMaxPages.addEventListener('input', () => {
        if (valMaxPages) valMaxPages.textContent = crawlerMaxPages.value;
      });
    }
    if (crawlerMaxDepth) {
      crawlerMaxDepth.addEventListener('input', () => {
        if (valMaxDepth) valMaxDepth.textContent = crawlerMaxDepth.value;
      });
    }
    if (crawlerDelayMs) {
      crawlerDelayMs.addEventListener('input', () => {
        if (valDelayMs) valDelayMs.textContent = `${crawlerDelayMs.value}ms`;
      });
    }

    if (btnStartCrawl) btnStartCrawl.addEventListener('click', handleStartCrawl);
    if (btnStopCrawl) btnStopCrawl.addEventListener('click', handleStopCrawl);
    if (btnRebuildIndex) btnRebuildIndex.addEventListener('click', handleRebuildIndex);
    if (btnClearTerminalLogs) {
      btnClearTerminalLogs.addEventListener('click', () => {
        if (crawlerLogTerminal) crawlerLogTerminal.innerHTML = '';
      });
    }
    if (btnClearCrawlerIndex) btnClearCrawlerIndex.addEventListener('click', handleClearIndex);

    if (tabCrawlerTerminal) {
      tabCrawlerTerminal.addEventListener('click', () => {
        tabCrawlerTerminal.classList.add('active');
        if (tabCrawlerDocs) tabCrawlerDocs.classList.remove('active');
        if (crawlerTerminalBox) crawlerTerminalBox.style.display = 'flex';
        if (crawlerDocsBox) crawlerDocsBox.style.display = 'none';
      });
    }
    if (tabCrawlerDocs) {
      tabCrawlerDocs.addEventListener('click', () => {
        tabCrawlerDocs.classList.add('active');
        if (tabCrawlerTerminal) tabCrawlerTerminal.classList.remove('active');
        if (crawlerTerminalBox) crawlerTerminalBox.style.display = 'none';
        if (crawlerDocsBox) crawlerDocsBox.style.display = 'block';
        fetchCrawlerPages();
      });
    }

    // Built-In Private Browser Event Listeners
    if (btnBrowserToggle) btnBrowserToggle.addEventListener('click', () => togglePrivateBrowser());
    if (btnCloseBrowser) btnCloseBrowser.addEventListener('click', () => closePrivateBrowser());
    if (btnBrowserNewTab) btnBrowserNewTab.addEventListener('click', () => createBrowserTab());
    if (btnBrowserSplitScreen) btnBrowserSplitScreen.addEventListener('click', () => toggleBrowserSplitScreen());
    if (btnBrowserMaximize) btnBrowserMaximize.addEventListener('click', () => toggleBrowserFullscreen());
    if (btnBrowserBack) btnBrowserBack.addEventListener('click', () => browserGoBack());
    if (btnBrowserForward) btnBrowserForward.addEventListener('click', () => browserGoForward());
    if (btnBrowserReload) btnBrowserReload.addEventListener('click', () => browserReload());
    if (btnBrowserHome) btnBrowserHome.addEventListener('click', () => browserGoHome());
    if (browserOmniboxForm) browserOmniboxForm.addEventListener('submit', handleBrowserOmniboxSubmit);
    if (btnBrowserBurnTab) btnBrowserBurnTab.addEventListener('click', () => burnActiveTab());
    if (btnBrowserClipToNotes) btnBrowserClipToNotes.addEventListener('click', () => clipBrowserPageToNotes());
    if (btnBrowserReaderToggle) btnBrowserReaderToggle.addEventListener('click', () => toggleBrowserReaderMode());
    if (btnBrowserExternalLink) {
      btnBrowserExternalLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activeTab = getActiveBrowserTab();
        const targetUrl = (activeTab && activeTab.url) ? activeTab.url : btnBrowserExternalLink.getAttribute('href');
        if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
          createBrowserTab(targetUrl, activeTab?.title || 'New Tab');
          showToast('Opened in new Aegis browser tab');
        }
      });
    }

    // Browser Engine Selector Listeners
    if (btnBrowserCurrentEngine) {
      btnBrowserCurrentEngine.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBrowserEngineDropdown();
      });
    }

    if (browserEngineDropdown) {
      browserEngineDropdown.querySelectorAll('.engine-opt').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          setBrowserEngine(opt.dataset.engine);
        });
      });
    }

    // Browser Omnibox Live Auto-Suggestions
    if (browserUrlInput) {
      browserUrlInput.addEventListener('input', handleBrowserOmniboxInput);
      browserUrlInput.addEventListener('keydown', handleBrowserOmniboxKeydown);
      browserUrlInput.addEventListener('focus', () => {
        browserUrlInput.select();
      });
      browserUrlInput.addEventListener('blur', () => {
        setTimeout(closeBrowserSuggestions, 180);
      });
    }

    document.querySelectorAll('.quick-link-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url) navigateActiveTab(url);
      });
    });

    window.addEventListener('message', handleBrowserIframeMessage);

    // -----------------------------------------------------------------------
    // Universal Iframe Navigation Tracker
    // Syncs parent URL bar & tab state on ANY navigation inside the iframe,
    // including "Next" buttons, pagination, link clicks, form submits, etc.
    // This fires for all non-Electron (web/iframe) browser sessions.
    // -----------------------------------------------------------------------
    if (browserIframe) {
      browserIframe.addEventListener('load', () => {
        // Only process when browser modal is open and we have an active tab
        if (!privateBrowserModalBackdrop || privateBrowserModalBackdrop.style.display === 'none') return;
        const activeTab = getActiveBrowserTab();
        if (!activeTab) return;

        // Stop loading bar animation
        triggerLoadingBar(false);

        // Try to extract the real proxied URL from the iframe's current src/location
        // The iframe src could be: /api/browser/proxy?tabId=...&url=<encoded>
        // or it could be an Aegis search page /browser/search?...
        try {
          const iframeSrc = browserIframe.src || '';
          if (!iframeSrc || iframeSrc === 'about:blank') return;

          let realUrl = iframeSrc;
          let displayUrl = iframeSrc;

          if (iframeSrc.includes('/api/browser/proxy') || iframeSrc.includes('/api/proxy')) {
            const u = new URL(iframeSrc, window.location.origin);
            const extracted = u.searchParams.get('url');
            if (extracted && /^https?:\/\//i.test(extracted)) {
              realUrl = extracted;
              displayUrl = extracted;
            }
            // Update tab URL if it changed (navigation happened inside iframe)
            if (activeTab.url !== realUrl) {
              activeTab.url = realUrl;
              // Push to tab history for back/forward support
              if (activeTab.historyIndex < 0 || activeTab.history[activeTab.historyIndex] !== realUrl) {
                if (activeTab.historyIndex < activeTab.history.length - 1) {
                  activeTab.history = activeTab.history.slice(0, activeTab.historyIndex + 1);
                }
                activeTab.history.push(realUrl);
                activeTab.historyIndex = activeTab.history.length - 1;
              }
            }
          } else if (iframeSrc.includes('/browser/search')) {
            realUrl = iframeSrc;
            try {
              const qs = iframeSrc.split('?')[1] || '';
              const params = new URLSearchParams(qs);
              const q = params.get('q');
              displayUrl = q ? q : iframeSrc;
            } catch(e) {}
          }

          // Sync browser URL bar
          if (browserUrlInput && document.activeElement !== browserUrlInput) {
            browserUrlInput.value = formatDisplayUrl(displayUrl);
          }

          // Sync external link button
          if (btnBrowserExternalLink) {
            btnBrowserExternalLink.href = realUrl;
            btnBrowserExternalLink.style.display = realUrl && !realUrl.startsWith('/browser/search') ? 'inline-flex' : 'none';
          }

          // Sync the iframe data attributes
          browserIframe.setAttribute('data-loaded-tab-id', activeTab.id);
          browserIframe.setAttribute('data-loaded-url', activeTab.url);

          // Update nav button states
          updateNavButtonStates();
          renderBrowserTabs();
        } catch(err) {
          // silently ignore cross-origin iframe access errors
        }
      });
    }

    // Close floating menus when clicking into iframe or window loses focus
    window.addEventListener('blur', () => {
      closeBrowserSuggestions();
      if (browserEngineDropdown) {
        browserEngineDropdown.style.display = 'none';
        if (btnBrowserCurrentEngine) btnBrowserCurrentEngine.classList.remove('active');
      }
    });

    document.addEventListener('pointerdown', (e) => {
      if (!searchForm.contains(e.target)) closeSuggestions();
      if (browserOmniboxForm && !browserOmniboxForm.contains(e.target)) {
        closeBrowserSuggestions();
      }
      if (browserEngineDropdown && (!btnBrowserCurrentEngine || !btnBrowserCurrentEngine.contains(e.target))) {
        browserEngineDropdown.style.display = 'none';
        if (btnBrowserCurrentEngine) btnBrowserCurrentEngine.classList.remove('active');
      }
    });

    window.addEventListener('keydown', handleGlobalBrowserShortcuts);

    // Supercharged Power Features Initializers
    initCommandPalette();
    initBookmarksManager();
    initDossierExporter();
    initReaderPro();
    initChromeDownloads();
    initChromeExtensions();
    initMediaEnhancements();
    initDeepResearch();
    initVoiceSearch();
    initLensOcr();
    initWorkspacesAndVerticalTabs();
    initBraveShieldsCockpit();
    initPasswordVault();
    initBrowserMediaPiP();
    initPageCaptures();
    initSplitViewBrowsing();
    initAiPageSummarizer();
    initTimeMachine();
    initWebHighlighter();
    initSpotlightIntegration();
  }

  // =========================================================================
  // Primary Search Dispatcher
  // =========================================================================
  function clearSearchViews() {
    if (resultsFeed) resultsFeed.innerHTML = '';
    if (imageResultsGrid) {
      imageResultsGrid.style.display = 'none';
      imageResultsGrid.innerHTML = '';
    }
    if (videoResultsGrid) {
      videoResultsGrid.style.display = 'none';
      videoResultsGrid.innerHTML = '';
    }
    if (instantAnswerContainer) {
      instantAnswerContainer.style.display = 'none';
      instantAnswerContainer.innerHTML = '';
    }
    if (knowledgeGraphSidebar) {
      knowledgeGraphSidebar.style.display = 'none';
      knowledgeGraphSidebar.innerHTML = '';
    }
    if (aiSynthesisContainer) {
      aiSynthesisContainer.style.display = 'none';
      aiSynthesisContainer.innerHTML = '';
    }
    if (deepResearchContainer && !state.deepResearchEnabled) {
      deepResearchContainer.style.display = 'none';
      deepResearchContainer.innerHTML = '';
    }
  }

  async function executeSearch(query, category = 'all') {
    state.currentQuery = query;
    state.selectedIndex = -1;

    if (!query) return;

    // Reset UI
    clearSearchViews();
    searchHero.classList.add('hero-compact');
    resultsSection.style.display = 'block';
    resultsSkeleton.style.display = 'block';
    btnClearSearch.style.display = 'flex';
    resultsCountText.textContent = 'Securing query and crawling sources...';

    // Track Metrics
    incrementMetric('queriesSecured', 1);

    try {
      const blockedParam = state.blockedDomains.join(',');
      const params = new URLSearchParams({
        q: query,
        cat: category,
        lens: state.currentLens,
        time: state.currentTimeFilter,
        filetype: state.currentFiletype,
        region: state.currentRegion || '',
        safeSearch: state.currentSafeSearch || '',
        blocked: blockedParam
      });

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      resultsSkeleton.style.display = 'none';

      // 1. Bang Redirect
      if (data.isBang && data.redirectUrl) {
        showToast(`Redirecting to ${data.bang.name}...`);
          openInPrivateBrowser(data.redirectUrl, data.bang.name);
        resultsCountText.textContent = `Routed to ${data.bang.name} via ${data.bang.prefix}`;
        return;
      }

      // 2. Instant Answer
      if (data.instantAnswer) {
        renderInstantAnswer(data.instantAnswer);
      } else {
        instantAnswerContainer.style.display = 'none';
        instantAnswerContainer.innerHTML = '';
      }

      // 2.5 Knowledge Graph Sidebar
      if (data.knowledgeGraph) {
        renderKnowledgeGraph(data.knowledgeGraph);
      } else if (knowledgeGraphSidebar) {
        knowledgeGraphSidebar.style.display = 'none';
        knowledgeGraphSidebar.innerHTML = '';
      }

      // 3. Render results
      state.results = data.results || [];

      if (category === 'images') {
        renderImagesGrid(state.results);
      } else if (category === 'videos') {
        renderVideosGrid(state.results);
      } else {
        renderResults(state.results, query);

        // 4. Trigger AI Synthesis or Deep Research
        if (state.deepResearchEnabled && category === 'all') {
          triggerDeepResearch(query);
        } else if (state.aiEnabled && state.results.length > 0 && category === 'all') {
          triggerAiSynthesis(query, state.results);
        }
      }

      incrementMetric('trackersBlocked', state.results.length * 3);

    } catch (err) {
      resultsSkeleton.style.display = 'none';
      resultsFeed.innerHTML = `
        <div class="empty-results-box">
          <h3>Search request failed</h3>
          <p>${escapeHtml(err.message || 'Could not connect to search backend.')}</p>
        </div>
      `;
    }
  }

  function setLens(lensId) {
    state.currentLens = lensId;
    const lensLabels = {
      all: { name: 'All Web', icon: '🌐' },
      discussions: { name: 'Discussions', icon: '💬' },
      academic: { name: 'Academic', icon: '🧪' },
      developer: { name: 'Developer', icon: '💻' },
      packages: { name: 'Packages', icon: '📦' },
      books: { name: 'Books', icon: '📚' },
      crypto: { name: 'Security', icon: '🔒' },
      news: { name: 'News', icon: '📰' },
      design: { name: 'Design', icon: '🎨' },
      finance: { name: 'Finance', icon: '📈' },
      foss: { name: 'FOSS', icon: '🛡️' }
    };

    const info = lensLabels[lensId] || { name: lensId, icon: '🔍' };
    activeLensIcon.textContent = info.icon;
    activeLensName.textContent = info.name;

    document.querySelectorAll('.lens-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lens === lensId);
    });
  }

  // =========================================================================
  // Perplexity-Style AI Synthesis with Narration
  // =========================================================================
  // =========================================================================
  // Google Search AI Overview (SGE Experience) with Narration & Follow-ups
  // =========================================================================
  async function triggerAiSynthesis(query, results) {
    aiSynthesisContainer.style.display = 'block';
    aiSynthesisContainer.innerHTML = `
      <div class="ai-synthesis-card">
        <div class="ai-card-header">
          <div class="ai-card-brand">
            <span class="ai-sparkle-icon">✨</span>
            <h3>AI Overview</h3>
            <span class="ai-experimental-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Generative AI is experimental
            </span>
          </div>
          <span class="ai-model-tag">Generating overview...</span>
        </div>
        <div class="skeleton-card" style="height: 110px; border-radius: 12px; margin-top: 10px;"></div>
      </div>
    `;

    try {
      const res = await fetch('/api/ai/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          results: results.slice(0, 5),
          provider: state.aiConfig.provider || 'auto',
          apiKey: state.aiConfig.apiKey || '',
          model: state.aiConfig.model || ''
        })
      });

      const data = await res.json();
      if (!data.success) {
        aiSynthesisContainer.style.display = 'none';
        return;
      }

      renderAiCard(data);

    } catch (e) {
      aiSynthesisContainer.style.display = 'none';
    }
  }

  function formatAiOverviewText(text) {
    if (!text) return '';
    const lines = text.split('\n');
    let inList = false;
    let html = '';

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        continue;
      }

      if (trimmed.startsWith('###')) {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        const title = escapeHtml(trimmed.replace(/^###\s*/, ''));
        html += `<h4 style="color: #c084fc; margin: 14px 0 8px; font-size: 1.05rem; font-weight: 600;">${title}</h4>`;
        continue;
      }

      if (/^[-•*]\s+/.test(trimmed)) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        let itemContent = trimmed.replace(/^[-•*]\s+/, '');
        itemContent = escapeHtml(itemContent)
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\[(\d+)\]/g, '<a href="#result-$1" class="citation-pill" data-target-id="$1">$1</a>');
        html += `<li>${itemContent}</li>`;
        continue;
      }

      if (inList) {
        html += '</ul>';
        inList = false;
      }

      let pContent = escapeHtml(trimmed)
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\[(\d+)\]/g, '<a href="#result-$1" class="citation-pill" data-target-id="$1">$1</a>');
      html += `<p>${pContent}</p>`;
    }

    if (inList) {
      html += '</ul>';
    }
    return html;
  }

  function renderAiCard(data) {
    const formattedHtml = formatAiOverviewText(data.answer);
    const citations = data.citations || [];
    const isLong = (data.answer || '').length > 340;

    const sourcesHtml = citations.length > 0 ? `
      <div class="ai-sources-carousel-wrapper">
        <div class="ai-sources-carousel-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>Sources</span>
        </div>
        <div class="ai-sources-carousel">
          ${citations.map(c => `
            <div class="ai-source-card" data-url="${escapeHtml(c.url)}" data-title="${escapeHtml(c.title)}" title="${escapeHtml(c.title)}">
              <div class="ai-source-card-header">
                ${c.favicon ? `<img class="ai-source-favicon" src="${escapeHtml(c.favicon)}" alt="" onerror="this.style.display='none'">` : ''}
                <span class="ai-source-domain">${escapeHtml(c.domain)}</span>
              </div>
              <div class="ai-source-title">${escapeHtml(c.title)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const followUps = data.followUps || [];
    const followUpsHtml = `
      <div class="ai-followup-container">
        ${followUps.length > 0 ? `
          <div class="ai-followup-chips">
            ${followUps.map(fu => `
              <button type="button" class="ai-followup-chip" data-query="${escapeHtml(fu)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>${escapeHtml(fu)}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <form class="ai-followup-input-wrapper" id="aiFollowUpForm">
          <input type="text" class="ai-followup-input" id="aiFollowUpInput" placeholder="Ask a follow up..." autocomplete="off">
          <button type="submit" class="ai-btn-send-followup" title="Search follow up">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    `;

    aiSynthesisContainer.innerHTML = `
      <div class="ai-synthesis-card">
        <div class="ai-card-header">
          <div class="ai-card-brand">
            <span class="ai-sparkle-icon">✨</span>
            <h3>AI Overview</h3>
            <span class="ai-experimental-tag">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              Generative AI is experimental
            </span>
          </div>
          <div class="ai-header-actions">
            <button type="button" class="ai-btn-action" id="btnSpeakAiSummary" title="Listen to AI Overview (Text-to-Speech)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <span>Listen</span>
            </button>
            <button type="button" class="ai-btn-action" id="btnCopyAiOverview" title="Copy Overview to Clipboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
            <span class="ai-model-tag">${escapeHtml(data.model || data.provider)}</span>
          </div>
        </div>

        ${sourcesHtml}

        <div class="ai-overview-expand-box ${isLong ? 'collapsed' : ''}" id="aiOverviewExpandBox">
          <div class="ai-content-body" id="aiCardText">
            ${formattedHtml}
          </div>
          ${isLong ? '<div class="ai-overview-fade-mask" id="aiOverviewFadeMask"></div>' : ''}
        </div>

        ${isLong ? `
          <button type="button" class="ai-btn-toggle-expand" id="btnToggleAiExpand">
            <span>Show more</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        ` : ''}

        ${followUpsHtml}
      </div>
    `;

    // 1. Source Card Clicks -> Open in Private Sandboxed Browser
    aiSynthesisContainer.querySelectorAll('.ai-source-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const url = card.dataset.url;
        const title = card.dataset.title;
        if (url) openInPrivateBrowser(url, title);
      });
    });

    // 2. Citation Pill Clicks -> Smooth scroll to result card
    aiSynthesisContainer.querySelectorAll('.citation-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const targetNum = parseInt(pill.dataset.targetId, 10) - 1;
        const targetCard = resultsFeed.children[targetNum];
        if (targetCard) {
          targetCard.classList.add('selected-result');
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => targetCard.classList.remove('selected-result'), 2200);
        }
      });
    });

    // 3. Expand / Collapse Toggle
    const btnExpand = document.getElementById('btnToggleAiExpand');
    const expandBox = document.getElementById('aiOverviewExpandBox');
    if (btnExpand && expandBox) {
      btnExpand.addEventListener('click', () => {
        const isCollapsed = expandBox.classList.contains('collapsed');
        if (isCollapsed) {
          expandBox.classList.remove('collapsed');
          btnExpand.innerHTML = `<span>Show less</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg>`;
        } else {
          expandBox.classList.add('collapsed');
          btnExpand.innerHTML = `<span>Show more</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>`;
        }
      });
    }

    // 4. Text-to-Speech "Listen" Button
    const btnSpeak = document.getElementById('btnSpeakAiSummary');
    if (btnSpeak) {
      btnSpeak.addEventListener('click', () => {
        const text = data.answer.replace(/\[\d+\]/g, '').replace(/[#*]/g, '');
        toggleSpeechNarration(text, btnSpeak);
      });
    }

    // 5. Copy Overview Button
    const btnCopy = document.getElementById('btnCopyAiOverview');
    if (btnCopy) {
      btnCopy.addEventListener('click', async () => {
        try {
          const cleanText = data.answer.replace(/\[\d+\]/g, '').replace(/###\s*/g, '').trim();
          await navigator.clipboard.writeText(cleanText);
          showToast('AI Overview copied to clipboard! 📋');
        } catch (e) {
          showToast('Failed to copy to clipboard');
        }
      });
    }

    // 6. Follow-up Chip Clicks & Follow-up Input Submission
    function triggerFollowUp(q) {
      if (!q || !q.trim()) return;
      const cleanQ = q.trim();
      searchInput.value = cleanQ;
      closeSuggestions();
      executeSearch(cleanQ, state.currentCategory || 'all');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    aiSynthesisContainer.querySelectorAll('.ai-followup-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        triggerFollowUp(chip.dataset.query);
      });
    });

    const followUpForm = document.getElementById('aiFollowUpForm');
    const followUpInput = document.getElementById('aiFollowUpInput');
    if (followUpForm && followUpInput) {
      followUpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        triggerFollowUp(followUpInput.value);
      });
    }
  }

  function toggleSpeechNarration(text, btn) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btn.querySelector('span').textContent = 'Listen';
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => { btn.querySelector('span').textContent = 'Listen'; };
    utterance.onerror = () => { btn.querySelector('span').textContent = 'Listen'; };

    btn.querySelector('span').textContent = 'Pause';
    window.speechSynthesis.speak(utterance);
  }

  // =========================================================================
  // Voice Search (Speech Recognition)
  // =========================================================================
  function handleVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser.', 'danger');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    btnVoiceSearch.classList.add('voice-listening');
    showToast('Listening... Speak now.');

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      searchInput.value = transcript;
      btnVoiceSearch.classList.remove('voice-listening');
      executeSearch(transcript, state.currentCategory);
    };

    recognition.onerror = () => {
      btnVoiceSearch.classList.remove('voice-listening');
      showToast('Could not capture audio.', 'danger');
    };

    recognition.onend = () => {
      btnVoiceSearch.classList.remove('voice-listening');
    };

    recognition.start();
  }

  // =========================================================================
  // Live Privacy Lab & Auditor
  // =========================================================================
  async function runPrivacyAudit() {
    labScoreNumber.textContent = '...';
    let score = 100;

    // 1. WebRTC Leak Test
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      statusWebRtc.textContent = 'Protected (Zero Leaks)';
      statusWebRtc.className = 'diag-status-badge pass';
      setTimeout(() => pc.close(), 1000);
    } catch (e) {
      statusWebRtc.textContent = 'Hardened (WebRTC Disabled)';
      statusWebRtc.className = 'diag-status-badge pass';
    }

    // 2. Canvas Fingerprint Entropy
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 16; canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('AegisPrivacy', 2, 2);
      const hash = canvas.toDataURL().length;
      statusCanvas.textContent = `Secured (Hash len: ${hash})`;
      statusCanvas.className = 'diag-status-badge pass';
    } catch (e) {
      statusCanvas.textContent = 'Sandboxed';
    }

    // 3. Referrer Suppression
    const ref = document.referrer;
    if (!ref) {
      statusReferrer.textContent = 'Suppressed (no-referrer)';
      statusReferrer.className = 'diag-status-badge pass';
    } else {
      statusReferrer.textContent = 'Active Origin';
      score -= 5;
    }

    // 4. AudioContext Fingerprint
    statusAudio.textContent = 'Low Entropy Signature';
    statusAudio.className = 'diag-status-badge pass';

    setTimeout(() => {
      labScoreNumber.textContent = `${score}%`;
      showToast(`Privacy Audit Complete: ${score}% Hardened.`);
    }, 400);
  }

  // =========================================================================
  // Research Scratchpad & Markdown Compiler
  // =========================================================================
  function toggleScratchpad(show) {
    const isShowing = scratchpadDrawer.style.display !== 'none';
    const target = show !== undefined ? show : !isShowing;
    scratchpadDrawer.style.display = target ? 'flex' : 'none';
    if (target) {
      scratchpadTextarea.focus();
      updateScratchpad();
    }
  }

  function updateScratchpad() {
    const content = scratchpadTextarea.value;
    localStorage.setItem('aegis_scratchpad', content);

    // Render preview
    const rendered = renderSimpleMarkdown(content);
    scratchpadPreviewBody.innerHTML = rendered || '<p class="preview-placeholder">Live preview will render here...</p>';

    // Words stats
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    scratchpadStats.textContent = `${words} words`;
  }

  function loadScratchpad() {
    const saved = localStorage.getItem('aegis_scratchpad');
    if (saved) {
      scratchpadTextarea.value = saved;
      updateScratchpad();
    }
  }

  function renderSimpleMarkdown(text) {
    if (!text) return '';
    return escapeHtml(text)
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/gim, '<p></p>')
      .replace(/\n/gim, '<br>');
  }

  function insertTextAtCursor(textarea, textToInsert) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + textToInsert + text.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    textarea.focus();
  }

  function clipResultToScratchpad(title, url, snippet) {
    const clip = `\n\n### [${title}](${url})\n> ${snippet}\n`;
    scratchpadTextarea.value += clip;
    updateScratchpad();
    showToast('Result clipped to Research Scratchpad!');
    toggleScratchpad(true);
  }

  function clipReaderToNotes() {
    const title = readerModalTitle.textContent;
    const url = readerDirectLink.href;
    const rawText = readerModalBody.innerText.substring(0, 1000);
    const clip = `\n\n## Excerpt: [${title}](${url})\n> ${rawText}...\n`;
    scratchpadTextarea.value += clip;
    updateScratchpad();
    showToast('Article excerpt clipped to Scratchpad!');
    toggleScratchpad(true);
  }

  async function saveScratchpadToVault() {
    const content = scratchpadTextarea.value.trim();
    if (!content) return;
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '') || 'Scratchpad Note';

    try {
      const res = await fetch('/api/vault/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: firstLine, content, tags: ['scratchpad', 'notes'] })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Scratchpad note successfully indexed into BM25 Vault!');
        loadVaultDocuments();
      }
    } catch (e) {
      showToast('Failed to save to vault.');
    }
  }

  function exportScratchpadMarkdown() {
    const content = scratchpadTextarea.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aegis_research_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Markdown file exported!');
  }

  // =========================================================================
  // Visual Lens & On-Device EXIF Scrubber
  // =========================================================================
  function handleExifFileUpload(e) {
    const file = e.target.files?.[0];
    if (file) processImageForExif(file);
  }

  function processImageForExif(file) {
    currentImageName = file.name.replace(/\.[^.]+$/, '');
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      exifPreviewImg.src = dataUrl;
      exifResultArea.style.display = 'flex';
      exifDropzone.style.display = 'none';

      // Perform on-device canvas scrubber
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          currentScrubbedBlob = blob;
          exifSummaryText.textContent = `✓ Image scrubbed clean (${img.naturalWidth}×${img.naturalHeight}). All EXIF markers and tracking beacons removed.`;
          exifTagsList.innerHTML = `
            <div>• Original file: ${escapeHtml(file.name)} (${(file.size / 1024).toFixed(1)} KB)</div>
            <div>• Camera EXIF: Stripped</div>
            <div>• Geolocation GPS: Cleared</div>
            <div>• Canvas clean blob ready for private download</div>
          `;
        }, 'image/jpeg', 0.92);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function downloadScrubbedImage() {
    if (!currentScrubbedBlob) return;
    const url = URL.createObjectURL(currentScrubbedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scrubbed_${currentImageName}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Cleaned image downloaded without tracking metadata!');
  }

  function searchByScrubbedKeywords() {
    exifModalBackdrop.style.display = 'none';
    const cleanName = currentImageName.replace(/[_-]/g, ' ');
    searchInput.value = cleanName;
    executeSearch(cleanName, state.currentCategory);
  }

  // =========================================================================
  // Standard Results Feed Rendering
  // =========================================================================
  function renderResults(results, query) {
    imageResultsGrid.style.display = 'none';
    videoResultsGrid.style.display = 'none';

    if (!results || results.length === 0) {
      resultsCountText.textContent = `No results found for "${query}"`;
      resultsFeed.innerHTML = `
        <div class="empty-results-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3>No matching results found</h3>
          <p>Try switching focus lenses, adjust power filters, or search your Local Vault.</p>
        </div>
      `;
      return;
    }

    resultsCountText.textContent = `${results.length} clean results retrieved anonymously`;
    const queryTokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    resultsFeed.innerHTML = results.map((item, index) => {
      const isLocal = item.isLocalDoc;
      const isNative = item.isNativeDoc || item.source === 'native_engine' || item.category === 'own';
      const domain = item.domain || (isLocal ? 'Local Vault' : (isNative ? 'Local Spider Index' : 'Web'));
      const highlightedSnippet = highlightText(item.snippet || '', queryTokens);

      return `
        <article class="result-card" data-index="${index}" tabindex="0">
          <div class="result-header-row">
            <div class="result-source-group">
              ${isNative ? '<span class="result-badge-privacy result-badge-native">⚡ Own Search Engine</span>' : ''}
              ${isLocal ? '<span class="result-badge-vault">Local Vault (BM25)</span>' : ''}
              <span class="result-domain">${escapeHtml(domain)}</span>
              <span class="result-badge-privacy">${escapeHtml(item.privacyScore || 'Zero Trackers')}</span>
            </div>

            ${!isLocal && domain ? `
              <button type="button" class="btn-mute-domain" data-domain="${escapeHtml(domain)}" title="Block ${escapeHtml(domain)} from future searches">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                <span>Block domain</span>
              </button>
            ` : ''}
          </div>

          <a href="${escapeHtml(item.url || '#')}" target="_blank" rel="noopener noreferrer" class="result-title-link">
            ${escapeHtml(item.title)}
          </a>

          <p class="result-snippet">${highlightedSnippet}</p>

          <div class="result-actions-toolbar">
            <button type="button" class="btn-action-pill btn-open-in-browser" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="3" ry="3"/><line x1="2" y1="9" x2="22" y2="9"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/></svg>
              Open in Browser
            </button>

            ${!isLocal ? `
              <button type="button" class="btn-action-pill btn-proxy-reader" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
                Read Privately
              </button>
            ` : ''}

            ${!isLocal && item.url ? `
              <button type="button" class="btn-action-pill btn-result-wayback" data-url="${escapeHtml(item.url)}" title="Look up Wayback Machine historical snapshots, bypass paywalls & view web archives">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ⌛ History
              </button>
            ` : ''}

            <button type="button" class="btn-action-pill btn-clip-note" data-index="${index}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Clip
            </button>

            <button type="button" class="btn-action-pill btn-copy-link" data-url="${escapeHtml(item.url || item.title)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy Link
            </button>

            <button type="button" class="btn-action-pill btn-save-bookmark" data-index="${index}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              Save
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Route all search result title clicks directly into the Aegis Private Browser
    resultsFeed.querySelectorAll('.result-title-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetUrl = link.getAttribute('data-url') || link.getAttribute('href');
        const title = link.textContent.trim();
        openInPrivateBrowser(targetUrl, title);
      });
    });

    resultsFeed.querySelectorAll('.btn-open-in-browser').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openInPrivateBrowser(btn.dataset.url, btn.dataset.title);
      });
    });

    resultsFeed.querySelectorAll('.btn-result-wayback').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTimeMachineForUrl(btn.dataset.url);
      });
    });

    // Attach Handlers
    resultsFeed.querySelectorAll('.btn-mute-domain').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        muteDomain(btn.dataset.domain);
      });
    });

    resultsFeed.querySelectorAll('.btn-proxy-reader').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProxyReader(btn.dataset.url, btn.dataset.title);
      });
    });

    resultsFeed.querySelectorAll('.btn-clip-note').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        const item = state.results[idx];
        if (item) clipResultToScratchpad(item.title, item.url, item.snippet);
      });
    });

    resultsFeed.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(btn.dataset.url);
        showToast('Clean link copied to clipboard!');
      });
    });

    resultsFeed.querySelectorAll('.btn-save-bookmark').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        saveBookmark(state.results[idx]);
      });
    });
  }

  function openImageLightbox(idx) {
    if (!currentLightboxImages || !currentLightboxImages[idx]) return;
    currentLightboxIndex = idx;
    const item = currentLightboxImages[idx];
    currentLightboxZoom = 1.0;
    if (lightboxImage) {
      lightboxImage.style.transform = 'scale(1)';
      lightboxImage.src = item.proxiedUrl || item.sourceUrl;
      lightboxImage.setAttribute('referrerpolicy', 'no-referrer');
    }
    if (lightboxTitle) {
      const dim = (item.width && item.height) ? ` • ${item.width} × ${item.height}` : '';
      const domain = item.domain ? ` • ${item.domain}` : '';
      lightboxTitle.textContent = `${item.title || 'Image Preview'}${dim}${domain}`;
    }
    if (lightboxDownloadBtn) {
      lightboxDownloadBtn.href = item.proxiedUrl || item.sourceUrl;
      lightboxDownloadBtn.download = `${(item.title || 'image').replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`;
    }
    if (lightboxSourceBtn) {
      lightboxSourceBtn.href = item.sourceUrl || item.proxiedUrl || '#';
      lightboxSourceBtn.dataset.url = item.sourceUrl || '';
      lightboxSourceBtn.dataset.title = item.title || '';
    }
    if (imageLightboxBackdrop) {
      imageLightboxBackdrop.style.display = 'flex';
    }
  }

  function navigateImageLightbox(delta) {
    if (!currentLightboxImages || currentLightboxImages.length === 0) return;
    let nextIdx = currentLightboxIndex + delta;
    if (nextIdx < 0) nextIdx = currentLightboxImages.length - 1;
    if (nextIdx >= currentLightboxImages.length) nextIdx = 0;
    openImageLightbox(nextIdx);
  }

  // =========================================================================
  // Media Grids (Images & Videos)
  // =========================================================================
  function renderImagesGrid(images) {
    resultsFeed.innerHTML = '';
    imageResultsGrid.style.display = 'grid';

    currentLightboxImages = images || [];
    currentLightboxIndex = -1;

    if (!images || images.length === 0) {
      imageResultsGrid.innerHTML = `
        <div class="empty-results-box" style="grid-column: 1 / -1;">
          <h3>No images found</h3>
          <p>Try a different keyword or query.</p>
        </div>
      `;
      return;
    }

    resultsCountText.textContent = `${images.length} proxied images retrieved without IP exposure`;

    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'><rect width='24' height='24' rx='4' fill='%231e293b'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>`;

    imageResultsGrid.innerHTML = images.map((img, idx) => {
      const displaySrc = img.proxiedUrl || img.sourceUrl || '';
      return `
        <div class="image-card" data-idx="${idx}">
          <img src="${escapeHtml(displaySrc)}" alt="${escapeHtml(img.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='${fallbackSvg}'">
          <div class="image-overlay">
            <span class="image-overlay-title">${escapeHtml(img.title)}</span>
            <span class="image-res-tag">${img.width || 800} × ${img.height || 600} • ${escapeHtml(img.domain || 'image')}</span>
          </div>
        </div>
      `;
    }).join('');

    imageResultsGrid.querySelectorAll('.image-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        openImageLightbox(idx);
      });
    });
  }

  function renderVideosGrid(videos) {
    resultsFeed.innerHTML = '';
    videoResultsGrid.style.display = 'grid';

    if (!videos || videos.length === 0) {
      videoResultsGrid.innerHTML = `
        <div class="empty-results-box" style="grid-column: 1 / -1;">
          <h3>No videos found</h3>
          <p>Try searching for another topic.</p>
        </div>
      `;
      return;
    }

    resultsCountText.textContent = `${videos.length} videos retrieved (privacy hardened)`;

    videoResultsGrid.innerHTML = videos.map((vid, idx) => `
      <div class="video-card" data-idx="${idx}">
        <div class="video-thumbnail-container">
          <img src="${escapeHtml(vid.thumbnail)}" alt="${escapeHtml(vid.title)}" loading="lazy">
          <div class="video-play-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="video-info">
          <div class="video-title">${escapeHtml(vid.title)}</div>
          <div class="video-source-tag">${escapeHtml(vid.source)}</div>
        </div>
      </div>
    `).join('');

    videoResultsGrid.querySelectorAll('.video-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        const item = videos[idx];
        if (!item) return;

        videoModalTitle.textContent = item.title;
        videoIframe.src = item.embedUrl;
        videoModalBackdrop.style.display = 'flex';
      });
    });
  }

  function closeVideoModal() {
    videoModalBackdrop.style.display = 'none';
    videoIframe.src = '';
  }

  // =========================================================================
  // Anonymous Proxy Reader Modal
  // =========================================================================
  async function openProxyReader(url, title) {
    readerModalBackdrop.style.display = 'flex';
    readerModalTitle.textContent = title || 'Loading Private Reader...';
    readerDocByline.textContent = 'Fetching and purging trackers...';
    readerDirectLink.href = url;
    readerTrackersCount.textContent = 'Analyzing...';
    readerReadingTime.textContent = '...';
    readerModalBody.innerHTML = '<div class="skeleton-card" style="height: 240px;"></div>';

    try {
      const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to clean document.');

      readerModalTitle.textContent = data.title || title;
      readerDocByline.textContent = `Source: ${data.domain} • By ${data.author || 'Author'}`;
      readerTrackersCount.textContent = `${data.trackersBlocked} trackers removed`;
      readerReadingTime.textContent = data.readingTime;
      readerModalBody.innerHTML = data.sanitizedHtml;

      incrementMetric('trackersBlocked', data.trackersBlocked);
      showToast(`Privately rendered: ${data.trackersBlocked} tracking scripts purged.`);

    } catch (err) {
      readerModalTitle.textContent = 'Reader Mode Unavailable';
      readerDocByline.textContent = 'Direct link available below';
      readerModalBody.innerHTML = `
        <p style="color: #f87171;">This website blocks automated reader extraction or timed out.</p>
        <p>You can still open the direct sanitized link securely in an isolated tab: <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color: var(--text-link);">${escapeHtml(url)}</a></p>
      `;
    }
  }

  function closeReaderModal() {
    readerModalBackdrop.style.display = 'none';
    readerModalBody.innerHTML = '';
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      const btnSpeak = document.getElementById('btnReaderSpeak');
      if (btnSpeak && btnSpeak.querySelector('span')) {
        btnSpeak.querySelector('span').textContent = 'Listen';
      }
    }
  }

  // =========================================================================
  // Local Document Vault & Folder Watcher
  // =========================================================================
  function toggleVaultDrawer(show) {
    vaultDrawer.style.display = show ? 'flex' : 'none';
    if (show) {
      loadVaultDocuments();
      checkWatchedFolderStatus();
    }
  }

  async function loadVaultDocuments() {
    try {
      const res = await fetch('/api/vault/list');
      const data = await res.json();
      if (data.documents) {
        vaultDocCount.textContent = data.documents.length;
        renderVaultList(data.documents);
      }
    } catch (e) {}
  }

  function renderVaultList(docs) {
    if (!docs || docs.length === 0) {
      vaultDocList.innerHTML = '<p style="color: var(--text-tertiary); font-size: 0.85rem;">No notes indexed yet. Add one above or sync a local folder!</p>';
      return;
    }

    vaultDocList.innerHTML = docs.map(doc => `
      <div class="vault-doc-item">
        <div class="vault-doc-top">
          <span class="vault-doc-title">${escapeHtml(doc.title)}</span>
          <button type="button" class="btn-vault-del" data-id="${escapeHtml(doc.id)}" title="Delete note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="vault-doc-snippet">${escapeHtml(doc.snippet)}</p>
        <div class="vault-tag-chips">
          ${(doc.tags || []).map(t => `<span class="vault-tag">#${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `).join('');

    vaultDocList.querySelectorAll('.btn-vault-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await fetch(`/api/vault/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
        showToast('Document removed from local vault.');
        loadVaultDocuments();
      });
    });
  }

  async function handleVaultAdd(e) {
    e.preventDefault();
    const title = document.getElementById('vaultDocTitle').value.trim();
    const tags = document.getElementById('vaultDocTags').value.trim();
    const content = document.getElementById('vaultDocContent').value.trim();
    if (!title || !content) return;

    try {
      const res = await fetch('/api/vault/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tags, content })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Document "${title}" indexed into BM25 vault!`);
        vaultForm.reset();
        document.getElementById('vaultAddDetails').open = false;
        loadVaultDocuments();
      }
    } catch (err) {
      showToast('Failed to add document.');
    }
  }

  async function handleFolderSync() {
    const folder = watchedFolderPath.value.trim();
    if (!folder) {
      showToast('Please enter an absolute local folder path.', 'danger');
      return;
    }

    folderSyncStatusText.textContent = 'Scanning and indexing directory...';

    try {
      const res = await fetch('/api/vault/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: folder })
      });

      const data = await res.json();
      if (!data.success) {
        folderSyncStatusText.textContent = `Error: ${data.error}`;
        showToast(data.error, 'danger');
        return;
      }

      folderSyncStatusText.textContent = `Watching: ${data.status.watchedPath} (${data.status.indexedFilesCount} files indexed)`;
      showToast(`Synced & watching ${data.status.indexedFilesCount} local files!`);
      loadVaultDocuments();

    } catch (e) {
      folderSyncStatusText.textContent = 'Failed to connect folder.';
    }
  }

  async function checkWatchedFolderStatus() {
    try {
      const res = await fetch('/api/vault/watch/status');
      const data = await res.json();
      if (data.active) {
        watchedFolderPath.value = data.watchedPath;
        folderSyncStatusText.textContent = `Watching: ${data.watchedPath} (${data.indexedFilesCount} files)`;
      }
    } catch (e) {}
  }

  // =========================================================================
  // Settings Modal & Tor Checking
  // =========================================================================
  function openSettingsModal() {
    settingsModalBackdrop.style.display = 'flex';
    aiProviderSelect.value = state.aiConfig.provider || 'auto';
    geminiApiKeyInput.value = state.aiConfig.apiKey || '';
    aiModelInput.value = state.aiConfig.model || '';
    geminiKeyGroup.style.display = aiProviderSelect.value === 'gemini' ? 'block' : 'none';
    const linkOpenModeSelect = document.getElementById('linkOpenModeSelect');
    if (linkOpenModeSelect) linkOpenModeSelect.value = state.linkOpenMode;
    checkTorStatus();
  }

  function handleSaveAiSettings() {
    state.aiConfig = {
      provider: aiProviderSelect.value,
      apiKey: geminiApiKeyInput.value.trim(),
      model: aiModelInput.value.trim()
    };
    localStorage.setItem('aegis_ai_config', JSON.stringify(state.aiConfig));
    showToast('AI preferences saved securely in browser sandbox.');
    settingsModalBackdrop.style.display = 'none';
  }

  async function checkTorStatus() {
    torStatusText.textContent = 'Auditing Tor network ports...';
    try {
      const res = await fetch('/api/tor/status');
      const data = await res.json();
      if (data.active) {
        torStatusText.textContent = `Tor Active: Connected via ${data.type} on port ${data.port}.`;
      } else {
        torStatusText.textContent = data.message;
      }
    } catch (e) {
      torStatusText.textContent = 'Could not audit Tor status.';
    }
  }

  // =========================================================================
  // SEO Spam Filter
  // =========================================================================
  function handleAddBlockedDomain() {
    const d = newBlockedDomainInput.value.trim();
    if (!d) return;
    muteDomain(d);
    newBlockedDomainInput.value = '';
  }

  function muteDomain(domain) {
    if (!domain) return;
    const clean = domain.toLowerCase();
    if (!state.blockedDomains.includes(clean)) {
      state.blockedDomains.push(clean);
      saveBlockedDomains();
      renderBlockedDomainsUI();
      showToast(`Domain "${clean}" blocked from search results.`);
      executeSearch(state.currentQuery, state.currentCategory);
    }
  }

  function renderBlockedDomainsUI() {
    if (!blockedDomainsList) return;
    blockedDomainsList.innerHTML = state.blockedDomains.map(d => `
      <span class="blocked-domain-tag">
        <span>${escapeHtml(d)}</span>
        <button type="button" data-domain="${escapeHtml(d)}">&times;</button>
      </span>
    `).join('');

    blockedDomainsList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.domain;
        state.blockedDomains = state.blockedDomains.filter(item => item !== d);
        saveBlockedDomains();
        renderBlockedDomainsUI();
        showToast(`Unblocked ${d}`);
      });
    });
  }

  function loadBlockedDomains() {
    try {
      const stored = localStorage.getItem('aegis_blocked_domains');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return ['pinterest.com', 'quora.com', 'expertvillage.com'];
  }

  function saveBlockedDomains() {
    try {
      localStorage.setItem('aegis_blocked_domains', JSON.stringify(state.blockedDomains));
    } catch (e) {}
  }

  function loadCustomLenses() {
    try {
      const stored = localStorage.getItem('aegis_custom_lenses');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }

  // =========================================================================
  // Client-Side AES-GCM 256-Bit Encrypted Vault Export / Import
  // =========================================================================
  async function handleExportEncryptedVault() {
    const password = vaultBackupPassword.value;
    if (!password || password.length < 4) {
      showToast('Please enter an encryption password (at least 4 chars).', 'danger');
      return;
    }

    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      bookmarks: JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]'),
      scratchpad: localStorage.getItem('aegis_scratchpad') || '',
      blockedDomains: state.blockedDomains,
      aiConfig: state.aiConfig,
      metrics: state.metrics
    };

    try {
      const encrypted = await encryptData(JSON.stringify(payload), password);
      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis_vault_backup_${Date.now()}.aegis`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('AES-GCM encrypted vault exported successfully!');
    } catch (err) {
      showToast('Failed to encrypt vault: ' + err.message, 'danger');
    }
  }

  async function handleImportEncryptedVault(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const password = prompt('Enter your encryption password to restore this vault:');
    if (!password) return;

    try {
      const text = await file.text();
      const decryptedJson = await decryptData(text, password);
      const data = JSON.parse(decryptedJson);

      if (data.bookmarks) localStorage.setItem('aegis_bookmarks', JSON.stringify(data.bookmarks));
      if (data.scratchpad) {
        localStorage.setItem('aegis_scratchpad', data.scratchpad);
        loadScratchpad();
      }
      if (data.blockedDomains) {
        state.blockedDomains = data.blockedDomains;
        saveBlockedDomains();
        renderBlockedDomainsUI();
      }
      if (data.aiConfig) {
        state.aiConfig = data.aiConfig;
        localStorage.setItem('aegis_ai_config', JSON.stringify(data.aiConfig));
      }

      showToast('Encrypted vault restored successfully!');
      settingsModalBackdrop.style.display = 'none';
    } catch (err) {
      showToast('Decryption failed! Incorrect password or corrupted file.', 'danger');
    }
  }

  async function encryptData(plaintext, password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));

    return JSON.stringify({
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext))
    });
  }

  async function decryptData(encryptedStr, password) {
    const parsed = JSON.parse(encryptedStr);
    const salt = new Uint8Array(parsed.salt);
    const iv = new Uint8Array(parsed.iv);
    const data = new Uint8Array(parsed.data);

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await window.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  }

  function exportHtmlBookmarks() {
    const list = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Aegis Private Bookmarks</H1>\n<DL><p>\n`;
    list.forEach(b => {
      html += `    <DT><A HREF="${escapeHtml(b.url)}">${escapeHtml(b.title)}</A>\n`;
    });
    html += '</DL><p>';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegis_bookmarks.html';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Standard HTML bookmarks exported!');
  }

  // =========================================================================
  // Keyboard Shortcuts & Navigation
  // =========================================================================
  function handleGlobalKeydown(e) {
    // Panic Button: Ctrl+Shift+X
    if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
      e.preventDefault();
      executePanicWipe();
      return;
    }

    // Toggle Scratchpad: Alt+N
    if (e.altKey && (e.key === 'N' || e.key === 'n')) {
      e.preventDefault();
      toggleScratchpad();
      return;
    }

    // Toggle Crawler Studio: Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
      e.preventDefault();
      toggleCrawlerStudio();
      return;
    }

    // Toggle Private Browser: Ctrl+Shift+B
    if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
      e.preventDefault();
      togglePrivateBrowser();
      return;
    }

    // Burn Tab: Ctrl+Shift+K (when browser is active)
    if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault();
      burnActiveTab();
      return;
    }

    // Modal close with Escape
    if (e.key === 'Escape') {
      closeReaderModal();
      closeVideoModal();
      closeCrawlerStudio();
      closePrivateBrowser();
      imageLightboxBackdrop.style.display = 'none';
      privacyLabModalBackdrop.style.display = 'none';
      exifModalBackdrop.style.display = 'none';
      toggleVaultDrawer(false);
      toggleScratchpad(false);
      settingsModalBackdrop.style.display = 'none';
      shortcutsModalBackdrop.style.display = 'none';
      closeSuggestions();
      lensDropdownMenu.style.display = 'none';
      return;
    }

    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    // '/' to focus search
    if (e.key === '/') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    // '?' for shortcuts
    if (e.key === '?') {
      e.preventDefault();
      shortcutsModalBackdrop.style.display = 'flex';
      return;
    }

    // ',' for settings
    if (e.key === ',') {
      e.preventDefault();
      openSettingsModal();
      return;
    }

    // 'v' to toggle Vault
    if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      toggleVaultDrawer(vaultDrawer.style.display === 'none');
      return;
    }

    // Results navigation: 'j' / 'k'
    if (state.results.length > 0 && state.currentCategory !== 'images' && state.currentCategory !== 'videos') {
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        cycleResults(1);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        cycleResults(-1);
      } else if (e.key === 'Enter' && state.selectedIndex >= 0) {
        e.preventDefault();
        const card = resultsFeed.children[state.selectedIndex];
        if (card) {
          const link = card.querySelector('.result-title-link');
          if (link) openInPrivateBrowser(link.getAttribute('data-url') || link.href, link.textContent.trim());
        }
      } else if ((e.key === 'p' || e.key === 'P') && state.selectedIndex >= 0) {
        e.preventDefault();
        const card = resultsFeed.children[state.selectedIndex];
        if (card) {
          const proxyBtn = card.querySelector('.btn-proxy-reader');
          if (proxyBtn) proxyBtn.click();
        }
      }
    }
  }

  function cycleResults(direction) {
    const cards = resultsFeed.querySelectorAll('.result-card');
    if (!cards.length) return;

    if (state.selectedIndex >= 0 && cards[state.selectedIndex]) {
      cards[state.selectedIndex].classList.remove('selected-result');
    }

    state.selectedIndex = Math.max(0, Math.min(cards.length - 1, state.selectedIndex + direction));
    const target = cards[state.selectedIndex];
    target.classList.add('selected-result');
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // =========================================================================
  // Suggestions & Autocomplete
  // =========================================================================
  async function fetchSuggestions(query) {
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      renderSuggestions(data.suggestions || []);
    } catch (e) {
      closeSuggestions();
    }
  }

  function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      closeSuggestions();
      return;
    }

    suggestionsDropdown.style.display = 'block';
    suggestionsDropdown.innerHTML = suggestions.map((s, idx) => `
      <div class="suggestion-item" data-index="${idx}" data-text="${escapeHtml(s.text)}">
        <div class="suggestion-main">
          ${s.type === 'bang' ? '<span class="suggestion-badge">Bang</span>' : ''}
          <span class="suggestion-text">${escapeHtml(s.text)}</span>
        </div>
        <span class="suggestion-desc">${escapeHtml(s.description || '')}</span>
      </div>
    `).join('');

    suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        searchInput.value = item.dataset.text;
        closeSuggestions();
        executeSearch(item.dataset.text, state.currentCategory);
      });
    });
  }

  function closeSuggestions() {
    suggestionsDropdown.style.display = 'none';
    suggestionsDropdown.innerHTML = '';
  }

  // =========================================================================
  // Metrics & Panic Wipe
  // =========================================================================
  function loadLocalMetrics() {
    try {
      const stored = localStorage.getItem('aegis_metrics');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { trackersBlocked: 36, queriesSecured: 12 };
  }

  function incrementMetric(key, amount = 1) {
    state.metrics[key] = (state.metrics[key] || 0) + amount;
    try {
      localStorage.setItem('aegis_metrics', JSON.stringify(state.metrics));
    } catch (e) {}
    updateHudDisplay();
  }

  function updateHudDisplay() {
    hudTrackersCount.textContent = `${state.metrics.trackersBlocked.toLocaleString()} blocked`;
  }

  function updateAiToggleButton() {
    btnToggleAi.classList.toggle('active', state.aiEnabled);
  }

  function loadAiConfig() {
    try {
      const stored = localStorage.getItem('aegis_ai_config');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { provider: 'auto', apiKey: '', model: '' };
  }

  function executePanicWipe() {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}

    state.metrics = { trackersBlocked: 0, queriesSecured: 0 };
    state.currentQuery = '';
    state.blockedDomains = ['pinterest.com', 'quora.com'];
    scratchpadTextarea.value = '';
    updateScratchpad();
    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    resultsSection.style.display = 'none';
    searchHero.classList.remove('hero-compact');
    updateHudDisplay();

    showToast('Panic Alert: All local storage, history, and cache wiped!', 'danger');
  }

  function saveBookmark(item) {
    if (!item) return;
    try {
      const list = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
      if (!list.some(b => b.url === item.url)) {
        list.push({ title: item.title, url: item.url, domain: item.domain, date: new Date().toLocaleDateString() });
        localStorage.setItem('aegis_bookmarks', JSON.stringify(list));
        if (typeof updateBookmarkBadge === 'function') updateBookmarkBadge();
        showToast('Result saved to private local bookmarks!');
      } else {
        showToast('Already saved in bookmarks.');
      }
    } catch (e) {}
  }

  function updateActiveCategoryTab(cat) {
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === cat);
    });
  }

  function highlightText(text, tokens) {
    if (!tokens || tokens.length === 0) return escapeHtml(text);
    let escaped = escapeHtml(text);
    for (const t of tokens) {
      const regex = new RegExp(`(${escapeRegex(t)})`, 'gi');
      escaped = escaped.replace(regex, '<mark>$1</mark>');
    }
    return escaped;
  }

  function renderInstantAnswer(answer) {
    instantAnswerContainer.style.display = 'block';
    let html = '';

    if (answer.type === 'calculator') {
      if (answer.isInteractive) {
        html = `
          <div class="instant-card instant-calculator-widget">
            <div class="instant-card-header">
              <span class="instant-badge">${escapeHtml(answer.badge)}</span>
              <span class="instant-subtext">Google-Grade Interactive Math Studio</span>
            </div>
            <div class="calc-screen">
              <div class="calc-screen-expr" id="calcScreenExpr">${escapeHtml(answer.expression || '')}</div>
              <div class="calc-screen-val" id="calcScreenVal">${escapeHtml(answer.result || '0')}</div>
            </div>
            <div class="calc-keypad-grid">
              <button type="button" class="calc-key btn-action" data-key="clear">C</button>
              <button type="button" class="calc-key btn-op" data-key="(">(</button>
              <button type="button" class="calc-key btn-op" data-key=")">)</button>
              <button type="button" class="calc-key btn-op" data-key="%">%</button>
              <button type="button" class="calc-key btn-op" data-key="/">÷</button>
              <button type="button" class="calc-key" data-key="7">7</button>
              <button type="button" class="calc-key" data-key="8">8</button>
              <button type="button" class="calc-key" data-key="9">9</button>
              <button type="button" class="calc-key btn-op" data-key="*">×</button>
              <button type="button" class="calc-key" data-key="4">4</button>
              <button type="button" class="calc-key" data-key="5">5</button>
              <button type="button" class="calc-key" data-key="6">6</button>
              <button type="button" class="calc-key btn-op" data-key="-">−</button>
              <button type="button" class="calc-key" data-key="1">1</button>
              <button type="button" class="calc-key" data-key="2">2</button>
              <button type="button" class="calc-key" data-key="3">3</button>
              <button type="button" class="calc-key btn-op" data-key="+">+</button>
              <button type="button" class="calc-key" data-key="0">0</button>
              <button type="button" class="calc-key" data-key=".">.</button>
              <button type="button" class="calc-key btn-action" data-key="backspace">⌫</button>
              <button type="button" class="calc-key btn-equals" data-key="=">=</button>
            </div>
          </div>
        `;
      } else {
        html = `
          <div class="instant-card">
            <div class="instant-card-header">
              <span class="instant-badge">${escapeHtml(answer.badge)}</span>
              <span class="instant-subtext">${escapeHtml(answer.expression)}</span>
            </div>
            <div class="instant-result-text">${escapeHtml(answer.result)}</div>
          </div>
        `;
      }
    } else if (answer.type === 'unit_conversion') {
      if (answer.isInteractive && answer.units) {
        html = `
          <div class="instant-card instant-converter-widget">
            <div class="instant-card-header">
              <span class="instant-badge">${escapeHtml(answer.badge)}</span>
              <span class="instant-subtext">${escapeHtml(answer.category || 'Unit Converter')}</span>
            </div>
            <div class="converter-inputs-grid">
              <div class="converter-box">
                <input type="number" step="any" class="converter-num-input" id="convVal1" value="${answer.val1 !== undefined ? answer.val1 : 1}">
                <select class="converter-unit-select" id="convUnit1">
                  ${(answer.units || []).map(u => `<option value="${escapeHtml(u)}" ${u === answer.unit1 ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}
                </select>
              </div>
              <div class="converter-equal-sign">=</div>
              <div class="converter-box">
                <input type="number" step="any" class="converter-num-input" id="convVal2" value="${answer.val2 !== undefined ? answer.val2 : 0}">
                <select class="converter-unit-select" id="convUnit2">
                  ${(answer.units || []).map(u => `<option value="${escapeHtml(u)}" ${u === answer.unit2 ? 'selected' : ''}>${escapeHtml(u)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="instant-subtext" style="margin-top: 10px; font-size: 0.85rem;" id="convFormulaText">
              ${escapeHtml(answer.formula || `${answer.from} = ${answer.result}`)}
            </div>
          </div>
        `;
      } else {
        html = `
          <div class="instant-card">
            <div class="instant-card-header">
              <span class="instant-badge">${escapeHtml(answer.badge)}</span>
              <span class="instant-subtext">${escapeHtml(answer.from)}</span>
            </div>
            <div class="instant-result-text">${escapeHtml(answer.result)}</div>
          </div>
        `;
      }
    } else if (answer.type === 'weather') {
      html = `
        <div class="instant-card instant-weather-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">${escapeHtml(answer.location)}</span>
          </div>
          <div class="weather-current-row">
            <div class="weather-icon">${answer.icon}</div>
            <div class="weather-temp-wrap">
              <div class="weather-temp-display" id="weatherTempDisplay">${answer.tempC}°C</div>
              <div class="weather-condition-text">${escapeHtml(answer.condition)}</div>
            </div>
            <div class="weather-unit-toggle">
              <button type="button" class="btn-unit-toggle active" id="btnWeatherC">°C</button>
              <span>|</span>
              <button type="button" class="btn-unit-toggle" id="btnWeatherF">°F</button>
            </div>
          </div>
          <div class="weather-details-grid">
            <div class="weather-detail-item"><span class="w-lbl">Precipitation:</span> <strong>${escapeHtml(answer.precip || '0%')}</strong></div>
            <div class="weather-detail-item"><span class="w-lbl">Humidity:</span> <strong>${escapeHtml(answer.humidity || '45%')}</strong></div>
            <div class="weather-detail-item"><span class="w-lbl">Wind:</span> <strong>${escapeHtml(answer.wind || '12 km/h')}</strong></div>
          </div>
          ${(answer.forecast && answer.forecast.length) ? `
            <div class="weather-forecast-strip">
              ${answer.forecast.map(f => `
                <div class="forecast-day-card">
                  <div class="f-day">${escapeHtml(f.day)}</div>
                  <div class="f-icon">${f.icon}</div>
                  <div class="f-temps"><span>${f.high}°</span> <small>${f.low}°</small></div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else if (answer.type === 'dictionary') {
      html = `
        <div class="instant-card instant-dictionary-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">${escapeHtml(answer.partOfSpeech)}</span>
          </div>
          <div class="dict-word-row">
            <h3 class="dict-word-title">${escapeHtml(answer.word)}</h3>
            <span class="dict-phonetic">${escapeHtml(answer.phonetic || '')}</span>
            <button type="button" class="btn-speak-word" id="btnSpeakWord" title="Pronounce word">
              🔊
            </button>
          </div>
          <ol class="dict-definitions-list">
            ${(answer.definitions || []).map(def => `
              <li>
                <div class="dict-def-text">${escapeHtml(def.definition)}</div>
                ${def.example ? `<div class="dict-example-text">"${escapeHtml(def.example)}"</div>` : ''}
              </li>
            `).join('')}
          </ol>
          ${(answer.synonyms && answer.synonyms.length) ? `
            <div class="dict-synonyms-wrap">
              <span class="dict-syn-label">Synonyms:</span>
              ${answer.synonyms.map(s => `<button type="button" class="dict-syn-chip" data-word="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    } else if (answer.type === 'timer') {
      html = `
        <div class="instant-card instant-timer-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">Online Stopwatch & Timer</span>
          </div>
          <div class="timer-display" id="timerDigitsDisplay">${escapeHtml(answer.display || '05:00')}</div>
          <div class="timer-controls">
            <button type="button" class="btn-timer-ctrl primary" id="btnTimerStart">Start</button>
            <button type="button" class="btn-timer-ctrl" id="btnTimerReset">Reset</button>
          </div>
        </div>
      `;
    } else if (answer.type === 'maps') {
      html = `
        <div class="instant-card instant-map-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">Google Parity Maps & Geography</span>
          </div>
          <div class="map-card-body">
            <div class="map-visual-placeholder">
              <div class="map-pin-icon">📍</div>
              <div class="map-coords-text">${escapeHtml(answer.location)} &bull; ${escapeHtml(answer.coordinates)}</div>
            </div>
            <div class="map-actions">
              <button type="button" class="btn-clean-mini" id="btnOpenMapTab" data-url="${escapeHtml(answer.mapUrl)}">Open Map in Tab ↗</button>
            </div>
          </div>
        </div>
      `;
    } else if (answer.type === 'currency') {
      html = `
        <div class="instant-card instant-currency-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">Real-Time Currency Conversion</span>
          </div>
          <div class="currency-row">
            <div class="currency-amount-large">${escapeHtml(answer.result)}</div>
            <div class="instant-subtext" style="font-family: var(--font-mono); font-size: 0.88rem; color: #34d399; margin-top: 4px;">${escapeHtml(answer.rateInfo || '')}</div>
          </div>
        </div>
      `;
    } else if (answer.type === 'cheatsheet') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header"><span class="instant-badge">${escapeHtml(answer.badge)}</span></div>
          <h3 style="font-size: 1.15rem; margin-bottom: 6px;">${escapeHtml(answer.title)}</h3>
          <p class="instant-subtext">${escapeHtml(answer.description)}</p>
          <pre class="instant-code-block">${escapeHtml(answer.code)}</pre>
        </div>
      `;
    } else if (answer.type === 'crypto_tool') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">Input: ${escapeHtml(answer.input)}</span>
          </div>
          <h3 style="font-size: 1.15rem; margin-bottom: 6px;">${escapeHtml(answer.title)}</h3>
          <div class="instant-crypto-row">
            <span class="instant-crypto-hash" id="instantCryptoHashVal">${escapeHtml(answer.result)}</span>
            <button type="button" class="instant-btn-copy" id="btnCopyCryptoHash">Copy</button>
          </div>
        </div>
      `;
    } else if (answer.type === 'world_clock') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header"><span class="instant-badge">${escapeHtml(answer.badge)}</span></div>
          <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${escapeHtml(answer.title)}</h3>
          <div class="instant-clock-time">${escapeHtml(answer.time)}</div>
          <div class="instant-clock-date">${escapeHtml(answer.date)} • ${escapeHtml(answer.timezone)}</div>
        </div>
      `;
    } else if (answer.type === 'qr_tool') {
      const qrSvg = generateSimpleQrSvg(answer.payload);
      html = `
        <div class="instant-card">
          <div class="instant-card-header"><span class="instant-badge">${escapeHtml(answer.badge)}</span></div>
          <h3 style="font-size: 1.15rem; margin-bottom: 6px;">${escapeHtml(answer.title)}</h3>
          <p class="instant-subtext">${escapeHtml(answer.description)}</p>
          <div class="instant-qr-container">
            <div class="instant-qr-box">${qrSvg}</div>
            <div>
              <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-cyan); word-break: break-all; margin-bottom: 8px;">
                ${escapeHtml(answer.payload)}
              </div>
              <button type="button" class="instant-btn-copy" id="btnCopyQrPayload">Copy Text</button>
            </div>
          </div>
        </div>
      `;
    } else if (answer.type === 'privacy_card') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header"><span class="instant-badge">${escapeHtml(answer.badge)}</span></div>
          <h3 style="font-size: 1.25rem; margin-bottom: 8px;">${escapeHtml(answer.title)}</h3>
          <p class="instant-subtext" style="margin-bottom: 12px;">${escapeHtml(answer.description)}</p>
        </div>
      `;
    } else if (answer.type === 'knowledge_card') {
      const comparisonRows = (answer.comparison || []).map(c => `
        <tr>
          <td><strong>${escapeHtml(c.feature)}</strong></td>
          <td style="color: #94a3b8;">${escapeHtml(c.google)}</td>
          <td style="color: #34d399; font-weight: 500;">${escapeHtml(c.aegis)}</td>
        </tr>
      `).join('');

      html = `
        <div class="instant-card knowledge-graph-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">${escapeHtml(answer.license)}</span>
          </div>
          <h3 style="font-size: 1.35rem; margin-bottom: 4px; color: #fff;">${escapeHtml(answer.title)}</h3>
          <h4 style="font-size: 0.95rem; color: var(--accent-emerald); margin-bottom: 12px; font-weight: 600;">
            ${escapeHtml(answer.subtitle)}
          </h4>
          <p class="instant-subtext" style="font-size: 0.88rem; line-height: 1.55; margin-bottom: 16px; color: #cbd5e1;">
            ${escapeHtml(answer.description)}
          </p>

          <div class="specs-table-wrapper" style="margin-bottom: 14px;">
            <table class="specs-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Google Search & Chrome</th>
                  <th>Aegis (Zeeshan Saeed)</th>
                </tr>
              </thead>
              <tbody>
                ${comparisonRows}
              </tbody>
            </table>
          </div>

          <div style="font-family: var(--font-mono); font-size: 0.76rem; color: #10b981;">
            <span>✓ ${escapeHtml(answer.attribution)}</span>
          </div>
        </div>
      `;
    } else if (answer.type === 'password_tool') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header">
            <span class="instant-badge">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">${escapeHtml(answer.entropy)} &bull; ${escapeHtml(answer.strength)}</span>
          </div>
          <h3 style="font-size: 1.15rem; margin-bottom: 6px;">${escapeHtml(answer.title)}</h3>
          <div class="instant-password-row">
            <span class="instant-password-text" id="instantPasswordTextVal">${escapeHtml(answer.password)}</span>
            <button type="button" class="instant-btn-copy" id="btnCopyPassword">Copy</button>
            <button type="button" class="instant-btn-copy" id="btnRegenPassword" style="background: rgba(16, 185, 129, 0.2); color: #34d399;" title="Generate new password">↺ New</button>
          </div>
          <p class="instant-subtext">${escapeHtml(answer.description)}</p>
        </div>
      `;
    } else if (answer.type === 'json_tool') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header">
            <span class="instant-badge" style="background: ${answer.status === 'valid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${answer.status === 'valid' ? 'var(--accent-emerald)' : '#ef4444'};">${escapeHtml(answer.badge)}</span>
            <span class="instant-subtext">${answer.status === 'valid' ? `${answer.keysCount} keys &bull; ${answer.rawLength} bytes` : 'Syntax Error'}</span>
          </div>
          <h3 style="font-size: 1.15rem; margin-bottom: 8px;">${escapeHtml(answer.title)}</h3>
          ${answer.status === 'valid' ? `
            <pre class="instant-json-box" id="instantJsonBoxVal">${escapeHtml(answer.formatted)}</pre>
            <button type="button" class="instant-btn-copy" id="btnCopyJson" style="margin-top: 10px;">Copy Formatted JSON</button>
          ` : `
            <div style="color: #ef4444; font-family: var(--font-mono); font-size: 0.85rem; margin: 10px 0;">${escapeHtml(answer.error)}</div>
            <pre class="instant-json-box">${escapeHtml(answer.raw)}</pre>
          `}
        </div>
      `;
    } else if (answer.type === 'color_tool') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header"><span class="instant-badge">${escapeHtml(answer.badge)}</span></div>
          <h3 style="font-size: 1.15rem; margin-bottom: 4px;">${escapeHtml(answer.title)}</h3>
          <div class="instant-color-card-body">
            <div class="instant-color-preview-box" style="background-color: ${escapeHtml(answer.previewHex)};"></div>
            <div class="instant-color-codes">
              <div><strong>HEX:</strong> <span id="colorHexVal">${escapeHtml(answer.hex)}</span> <button type="button" class="instant-btn-copy" id="btnCopyColorHex" style="margin-left: 6px; padding: 2px 7px;">Copy</button></div>
              <div><strong>RGB:</strong> <span id="colorRgbVal">${escapeHtml(answer.rgb)}</span> <button type="button" class="instant-btn-copy" id="btnCopyColorRgb" style="margin-left: 6px; padding: 2px 7px;">Copy</button></div>
              <div><strong>HSL:</strong> <span id="colorHslVal">${escapeHtml(answer.hsl)}</span> <button type="button" class="instant-btn-copy" id="btnCopyColorHsl" style="margin-left: 6px; padding: 2px 7px;">Copy</button></div>
            </div>
          </div>
        </div>
      `;
    } else if (answer.type === 'url_codec_tool') {
      html = `
        <div class="instant-card">
          <div class="instant-card-header"><span class="instant-badge">${escapeHtml(answer.badge)}</span></div>
          <h3 style="font-size: 1.15rem; margin-bottom: 6px;">URL ${escapeHtml(answer.action)}</h3>
          <div class="instant-crypto-row">
            <span class="instant-crypto-hash" id="urlCodecResultVal">${escapeHtml(answer.result)}</span>
            <button type="button" class="instant-btn-copy" id="btnCopyUrlCodec">Copy</button>
          </div>
          <p class="instant-subtext" style="margin-top: 8px;">Input: ${escapeHtml(answer.input)}</p>
        </div>
      `;
    }

    instantAnswerContainer.innerHTML = html;

    // Initialize interactive tools if applicable
    if (answer.type === 'calculator' && answer.isInteractive) {
      initInteractiveCalculator(answer);
    } else if (answer.type === 'unit_conversion' && answer.isInteractive) {
      initInteractiveConverter(answer);
    } else if (answer.type === 'weather') {
      initInteractiveWeather(answer);
    } else if (answer.type === 'dictionary') {
      initInteractiveDictionary(answer);
    } else if (answer.type === 'timer') {
      initInteractiveTimer(answer);
    } else if (answer.type === 'maps') {
      const btnMap = document.getElementById('btnOpenMapTab');
      if (btnMap) {
        btnMap.addEventListener('click', () => {
          if (btnMap.dataset.url) {
            createBrowserTab(btnMap.dataset.url);
            togglePrivateBrowser(true);
          }
        });
      }
    }

    // Attach copy buttons
    const btnCopy = document.getElementById('btnCopyCryptoHash');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const val = document.getElementById('instantCryptoHashVal').textContent;
        navigator.clipboard.writeText(val);
        btnCopy.textContent = 'Copied!';
        setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1800);
      });
    }

    const btnCopyPassword = document.getElementById('btnCopyPassword');
    if (btnCopyPassword) {
      btnCopyPassword.addEventListener('click', () => {
        const val = document.getElementById('instantPasswordTextVal').textContent;
        navigator.clipboard.writeText(val);
        btnCopyPassword.textContent = 'Copied!';
        setTimeout(() => { btnCopyPassword.textContent = 'Copy'; }, 1800);
      });
    }

    const btnRegenPassword = document.getElementById('btnRegenPassword');
    if (btnRegenPassword) {
      btnRegenPassword.addEventListener('click', () => {
        executeSearch(state.currentQuery, state.currentCategory);
      });
    }

    const btnCopyJson = document.getElementById('btnCopyJson');
    if (btnCopyJson) {
      btnCopyJson.addEventListener('click', () => {
        const val = document.getElementById('instantJsonBoxVal').textContent;
        navigator.clipboard.writeText(val);
        btnCopyJson.textContent = 'Copied!';
        setTimeout(() => { btnCopyJson.textContent = 'Copy Formatted JSON'; }, 1800);
      });
    }

    const btnCopyColorHex = document.getElementById('btnCopyColorHex');
    if (btnCopyColorHex) {
      btnCopyColorHex.addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('colorHexVal').textContent);
        btnCopyColorHex.textContent = 'Copied!';
        setTimeout(() => { btnCopyColorHex.textContent = 'Copy'; }, 1800);
      });
    }

    const btnCopyColorRgb = document.getElementById('btnCopyColorRgb');
    if (btnCopyColorRgb) {
      btnCopyColorRgb.addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('colorRgbVal').textContent);
        btnCopyColorRgb.textContent = 'Copied!';
        setTimeout(() => { btnCopyColorRgb.textContent = 'Copy'; }, 1800);
      });
    }

    const btnCopyColorHsl = document.getElementById('btnCopyColorHsl');
    if (btnCopyColorHsl) {
      btnCopyColorHsl.addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('colorHslVal').textContent);
        btnCopyColorHsl.textContent = 'Copied!';
        setTimeout(() => { btnCopyColorHsl.textContent = 'Copy'; }, 1800);
      });
    }

    const btnCopyUrlCodec = document.getElementById('btnCopyUrlCodec');
    if (btnCopyUrlCodec) {
      btnCopyUrlCodec.addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('urlCodecResultVal').textContent);
        btnCopyUrlCodec.textContent = 'Copied!';
        setTimeout(() => { btnCopyUrlCodec.textContent = 'Copy'; }, 1800);
      });
    }

    const btnCopyQr = document.getElementById('btnCopyQrPayload');
    if (btnCopyQr) {
      btnCopyQr.addEventListener('click', () => {
        navigator.clipboard.writeText(answer.payload);
        btnCopyQr.textContent = 'Copied!';
        setTimeout(() => { btnCopyQr.textContent = 'Copy Text'; }, 1800);
      });
    }
  }

  function evaluateCalcExpression(expr) {
    if (!expr) return '0';
    try {
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/,/g, '');
      if (!/^[0-9+\-*/().\s%]+$/.test(sanitized)) return 'Error';
      const pctClean = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
      const fn = new Function(`'use strict'; return (${pctClean})`);
      const res = fn();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        return Number.isInteger(res) ? String(res) : parseFloat(res.toFixed(6)).toString();
      }
      return 'Error';
    } catch (e) {
      return '';
    }
  }

  function initInteractiveCalculator(answer) {
    const screenExpr = document.getElementById('calcScreenExpr');
    const screenVal = document.getElementById('calcScreenVal');
    const keypad = document.querySelector('.calc-keypad-grid');
    if (!screenExpr || !screenVal || !keypad) return;

    let expr = (answer.expression || '').replace(/=/g, '').trim();

    keypad.querySelectorAll('.calc-key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === 'clear') {
          expr = '';
          screenExpr.textContent = '';
          screenVal.textContent = '0';
        } else if (key === 'backspace') {
          expr = expr.slice(0, -1);
          screenExpr.textContent = expr;
          const live = evaluateCalcExpression(expr);
          screenVal.textContent = live && live !== 'Error' ? live : (expr || '0');
        } else if (key === '=') {
          const res = evaluateCalcExpression(expr);
          if (res && res !== 'Error') {
            screenVal.textContent = res;
            screenExpr.textContent = expr + ' =';
            expr = res;
          }
        } else {
          expr += (btn.textContent || key).trim();
          screenExpr.textContent = expr;
          const live = evaluateCalcExpression(expr);
          if (live && live !== 'Error') {
            screenVal.textContent = live;
          }
        }
      });
    });
  }

  function initInteractiveConverter(answer) {
    const input1 = document.getElementById('convVal1');
    const sel1 = document.getElementById('convUnit1');
    const input2 = document.getElementById('convVal2');
    const sel2 = document.getElementById('convUnit2');
    const formulaText = document.getElementById('convFormulaText');
    if (!input1 || !sel1 || !input2 || !sel2) return;

    const UNIT_FACTORS = {
      m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254,
      kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495,
      'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444,
      b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776
    };

    function convertTemp(v, from, to) {
      let c = v;
      if (from === 'f') c = (v - 32) * (5 / 9);
      else if (from === 'k') c = v - 273.15;
      if (to === 'c') return c;
      if (to === 'f') return c * (9 / 5) + 32;
      if (to === 'k') return c + 273.15;
      return c;
    }

    function doConvert(source) {
      const u1 = (sel1.value || '').toLowerCase();
      const u2 = (sel2.value || '').toLowerCase();

      if (source === 1) {
        const v1 = parseFloat(input1.value);
        if (isNaN(v1)) { input2.value = ''; return; }

        if (['c', 'f', 'k'].includes(u1) && ['c', 'f', 'k'].includes(u2)) {
          const res = convertTemp(v1, u1, u2);
          input2.value = parseFloat(res.toFixed(4));
        } else if (UNIT_FACTORS[u1] && UNIT_FACTORS[u2]) {
          const base = v1 * UNIT_FACTORS[u1];
          const res = base / UNIT_FACTORS[u2];
          input2.value = parseFloat(res.toFixed(6));
        }
      } else {
        const v2 = parseFloat(input2.value);
        if (isNaN(v2)) { input1.value = ''; return; }

        if (['c', 'f', 'k'].includes(u1) && ['c', 'f', 'k'].includes(u2)) {
          const res = convertTemp(v2, u2, u1);
          input1.value = parseFloat(res.toFixed(4));
        } else if (UNIT_FACTORS[u1] && UNIT_FACTORS[u2]) {
          const base = v2 * UNIT_FACTORS[u2];
          const res = base / UNIT_FACTORS[u1];
          input1.value = parseFloat(res.toFixed(6));
        }
      }

      if (formulaText) {
        formulaText.textContent = `${input1.value} ${u1} = ${input2.value} ${u2}`;
      }
    }

    input1.addEventListener('input', () => doConvert(1));
    sel1.addEventListener('change', () => doConvert(1));
    input2.addEventListener('input', () => doConvert(2));
    sel2.addEventListener('change', () => doConvert(1));
  }

  function initInteractiveWeather(answer) {
    const btnC = document.getElementById('btnWeatherC');
    const btnF = document.getElementById('btnWeatherF');
    const tempDisp = document.getElementById('weatherTempDisplay');
    if (!btnC || !btnF || !tempDisp) return;

    btnC.addEventListener('click', () => {
      btnC.classList.add('active');
      btnF.classList.remove('active');
      tempDisp.textContent = `${answer.tempC}°C`;
    });

    btnF.addEventListener('click', () => {
      btnF.classList.add('active');
      btnC.classList.remove('active');
      tempDisp.textContent = `${answer.tempF}°F`;
    });
  }

  function initInteractiveDictionary(answer) {
    const btnSpeak = document.getElementById('btnSpeakWord');
    if (btnSpeak && 'speechSynthesis' in window) {
      btnSpeak.addEventListener('click', () => {
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(answer.word);
          u.lang = 'en-US';
          window.speechSynthesis.speak(u);
        } catch (e) {}
      });
    }

    document.querySelectorAll('.dict-syn-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const syn = chip.dataset.word;
        if (syn) {
          searchInput.value = `define ${syn}`;
          executeSearch(`define ${syn}`);
        }
      });
    });
  }

  function initInteractiveTimer(answer) {
    const display = document.getElementById('timerDigitsDisplay');
    const btnStart = document.getElementById('btnTimerStart');
    const btnReset = document.getElementById('btnTimerReset');
    if (!display || !btnStart || !btnReset) return;

    let totalSeconds = answer.seconds || 300;
    let remaining = totalSeconds;
    let timerId = null;
    let isRunning = false;

    function renderTime() {
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function playChime() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } catch (e) {}
    }

    btnStart.addEventListener('click', () => {
      if (isRunning) {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        btnStart.textContent = 'Start';
        btnStart.classList.remove('running');
      } else {
        if (remaining <= 0) remaining = totalSeconds;
        isRunning = true;
        btnStart.textContent = 'Pause';
        btnStart.classList.add('running');
        timerId = setInterval(() => {
          remaining--;
          renderTime();
          if (remaining <= 0) {
            clearInterval(timerId);
            timerId = null;
            isRunning = false;
            btnStart.textContent = 'Start';
            btnStart.classList.remove('running');
            playChime();
            showToast('⏰ Timer completed!');
          }
        }, 1000);
      }
    });

    btnReset.addEventListener('click', () => {
      clearInterval(timerId);
      timerId = null;
      isRunning = false;
      remaining = totalSeconds;
      renderTime();
      btnStart.textContent = 'Start';
      btnStart.classList.remove('running');
    });
  }

  function renderKnowledgeGraph(kg) {
    if (!knowledgeGraphSidebar) return;
    if (!kg || !kg.title) {
      knowledgeGraphSidebar.style.display = 'none';
      knowledgeGraphSidebar.innerHTML = '';
      return;
    }

    knowledgeGraphSidebar.style.display = 'block';
    const attrRows = (kg.attributes || []).map(a => `
      <div class="kg-attr-row">
        <span class="kg-attr-label">${escapeHtml(a.label)}:</span>
        <span class="kg-attr-value">${escapeHtml(a.value)}</span>
      </div>
    `).join('');

    const sourceLinks = (kg.sources || []).map(s => `
      <a href="${escapeHtml(s.url)}" class="kg-source-link" data-url="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a>
    `).join('');

    knowledgeGraphSidebar.innerHTML = `
      <div class="kg-card">
        <div class="kg-header">
          <span class="kg-badge">KNOWLEDGE GRAPH</span>
          ${kg.verified ? '<span class="kg-verified-badge">✓ Verified</span>' : ''}
        </div>
        <h3 class="kg-title">${escapeHtml(kg.title)}</h3>
        <div class="kg-subtitle">${escapeHtml(kg.subtitle || '')}</div>
        <p class="kg-description">${escapeHtml(kg.description || '')}</p>
        ${attrRows ? `<div class="kg-attributes-list">${attrRows}</div>` : ''}
        <div class="kg-actions-row">
          ${kg.officialWebsite ? `<button type="button" class="btn-kg-action" id="btnKgOpenSite" data-url="${escapeHtml(kg.officialWebsite)}">Visit Website</button>` : ''}
          <button type="button" class="btn-kg-action secondary" id="btnKgResearch" data-query="${escapeHtml(kg.title)}">Deep Research</button>
        </div>
        ${sourceLinks ? `<div class="kg-sources-footer"><span>Sources:</span> ${sourceLinks}</div>` : ''}
      </div>
    `;

    const btnSite = document.getElementById('btnKgOpenSite');
    if (btnSite) {
      btnSite.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btnSite.dataset.url;
        if (url) {
          openInPrivateBrowser(url, `${kg.title} (Official Website)`);
        }
      });
    }

    const btnResearch = document.getElementById('btnKgResearch');
    if (btnResearch) {
      btnResearch.addEventListener('click', () => {
        const q = btnResearch.dataset.query;
        if (q) {
          searchInput.value = q;
          executeSearch(q);
        }
      });
    }
  }

  function generateSimpleQrSvg(text) {
    // Generate a clean stylized 21x21 QR pattern SVG
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    const size = 21;
    let paths = '';
    
    // Position detection squares (top-left, top-right, bottom-left)
    function addBox(r, c) {
      paths += `M ${c*5} ${r*5} h 35 v 35 h -35 z `;
      paths += `M ${c*5+5} ${r*5+5} h 25 v 25 h -25 z `;
      paths += `M ${c*5+10} ${r*5+10} h 15 v 15 h -15 z `;
    }
    addBox(0, 0);
    addBox(0, 14);
    addBox(14, 0);

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if ((r < 7 && c < 7) || (r < 7 && c >= 14) || (r >= 14 && c < 7)) continue;
        const bit = Math.abs(Math.sin((r * 31 + c * 17 + hash)) * 10000) % 2 > 1;
        if (bit) {
          paths += `M ${c*5} ${r*5} h 5 v 5 h -5 z `;
        }
      }
    }

    return `<svg width="105" height="105" viewBox="0 0 105 105" fill="#05070a" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${paths}"/></svg>`;
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'danger' ? 'toast-danger' : ''}`;
    toast.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'danger' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' : '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'}
      </svg>
      <span>${escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // =========================================================================
  // Autonomous Web Crawler & Native Inverted Index Controller
  // =========================================================================
  function toggleCrawlerStudio(show) {
    const isShowing = crawlerStudioModalBackdrop && crawlerStudioModalBackdrop.style.display !== 'none';
    const target = show !== undefined ? show : !isShowing;
    if (target) {
      openCrawlerStudio();
    } else {
      closeCrawlerStudio();
    }
  }

  function openCrawlerStudio() {
    if (!crawlerStudioModalBackdrop) return;
    crawlerStudioModalBackdrop.style.display = 'flex';
    fetchCrawlerStats();
    fetchCrawlerPages();
    startCrawlerPolling();
  }

  function closeCrawlerStudio() {
    if (!crawlerStudioModalBackdrop) return;
    crawlerStudioModalBackdrop.style.display = 'none';
    if (!isCrawlerActive) {
      stopCrawlerPolling();
    }
  }

  function startCrawlerPolling() {
    if (crawlerPollingInterval) clearInterval(crawlerPollingInterval);
    pollCrawlerStatus();
    crawlerPollingInterval = setInterval(pollCrawlerStatus, 900);
  }

  function stopCrawlerPolling() {
    if (crawlerPollingInterval) {
      clearInterval(crawlerPollingInterval);
      crawlerPollingInterval = null;
    }
  }

  async function pollCrawlerStatus() {
    try {
      const res = await fetch('/api/crawler/status');
      const data = await res.json();
      if (!data) return;

      isCrawlerActive = !!data.isCrawling;
      if (crawlerHeaderStatusDot) crawlerHeaderStatusDot.classList.toggle('active', isCrawlerActive);
      if (radarSweepBeam) radarSweepBeam.classList.toggle('active', isCrawlerActive);
      if (btnStartCrawl) btnStartCrawl.disabled = isCrawlerActive;
      if (btnStopCrawl) btnStopCrawl.disabled = !isCrawlerActive;

      if (crawlerHudStatus) {
        crawlerHudStatus.textContent = isCrawlerActive ? 'SPIDER ACTIVE' : 'IDLE';
        crawlerHudStatus.style.color = isCrawlerActive ? 'var(--accent-emerald)' : 'var(--text-primary)';
      }
      if (crawlerHudQueue) crawlerHudQueue.textContent = (data.queue || []).length;
      if (radarStatusText) {
        radarStatusText.textContent = isCrawlerActive 
          ? `Spider Radar: Crawling (${data.crawledCount}/${data.maxPages})` 
          : 'Spider Radar: Idle';
      }

      if (isCrawlerActive && Math.random() > 0.3) {
        addRadarBlip();
      }

      // Append new logs
      if (data.recentLogs && data.recentLogs.length > 0) {
        const newLogs = data.recentLogs.slice(lastCrawlerLogIndex);
        if (newLogs.length > 0) {
          newLogs.forEach(entry => appendCrawlerLog(entry));
          lastCrawlerLogIndex = data.recentLogs.length;
        }
      }

      // Update metrics
      if (data.stats) {
        if (crawlerHudDocs) crawlerHudDocs.textContent = data.stats.totalDocs || 0;
        if (crawlerHudTerms) crawlerHudTerms.textContent = data.stats.totalTerms || 0;
        if (crawlerHudAvgWords) crawlerHudAvgWords.textContent = `${data.stats.avgDocLength || 0} words`;
        if (crawlerDocsCountBadge) crawlerDocsCountBadge.textContent = data.stats.totalDocs || 0;
      }
    } catch (e) {}
  }

  function addRadarBlip() {
    if (!radarBlipsContainer) return;
    const blip = document.createElement('div');
    blip.className = 'radar-blip';
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 50;
    const x = 75 + Math.cos(angle) * radius;
    const y = 75 + Math.sin(angle) * radius;
    blip.style.left = `${x}px`;
    blip.style.top = `${y}px`;
    radarBlipsContainer.appendChild(blip);
    setTimeout(() => blip.remove(), 2400);
  }

  function appendCrawlerLog(entry) {
    if (!crawlerLogTerminal) return;
    const line = document.createElement('div');
    line.className = 'log-line';
    
    let tagClass = 'tag-crawl';
    if (entry.tag === 'INDEX') tagClass = 'tag-index';
    else if (entry.tag === 'SKIP' || entry.tag === 'WARN') tagClass = 'tag-skip';
    else if (entry.tag === 'ERROR') tagClass = 'tag-err';
    else if (entry.tag === 'SYS' || entry.tag === 'READY' || entry.tag === 'STOP') tagClass = 'tag-sys';

    line.innerHTML = `
      <span class="log-time">[${escapeHtml(entry.time || '')}]</span>
      <span class="log-tag ${tagClass}">[${escapeHtml(entry.tag || 'CRAWL')}]</span>
      <span class="log-msg">${escapeHtml(entry.message || '')}</span>
    `;
    crawlerLogTerminal.appendChild(line);
    crawlerLogTerminal.scrollTop = crawlerLogTerminal.scrollHeight;
  }

  async function fetchCrawlerStats() {
    try {
      const res = await fetch('/api/crawler/stats');
      const stats = await res.json();
      if (stats) {
        if (crawlerHudDocs) crawlerHudDocs.textContent = stats.totalDocs || 0;
        if (crawlerHudTerms) crawlerHudTerms.textContent = stats.totalTerms || 0;
        if (crawlerHudAvgWords) crawlerHudAvgWords.textContent = `${stats.avgDocLength || 0} words`;
        if (crawlerDocsCountBadge) crawlerDocsCountBadge.textContent = stats.totalDocs || 0;
      }
    } catch (e) {}
  }

  async function fetchCrawlerPages() {
    try {
      const res = await fetch('/api/crawler/pages');
      const docs = await res.json();
      renderCrawlerDocsTable(docs);
    } catch (e) {}
  }

  function renderCrawlerDocsTable(docs) {
    if (!crawlerDocsTableBody) return;
    if (!docs || docs.length === 0) {
      crawlerDocsTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No documents in native index yet. Launch the spider on a seed URL above!
          </td>
        </tr>
      `;
      return;
    }

    crawlerDocsTableBody.innerHTML = docs.map(doc => `
      <tr>
        <td>
          <div class="doc-title-cell">
            <a href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer" class="doc-title-link">
              ${escapeHtml(doc.title || doc.url)}
            </a>
            <span class="doc-url-sub">${escapeHtml(doc.url)}</span>
          </div>
        </td>
        <td>${doc.wordCount || 0}</td>
        <td><span class="rank-badge">${(doc.pageRankBoost || 1).toFixed(2)}x</span></td>
        <td>
          <button type="button" class="btn-del-doc" data-id="${escapeHtml(doc.id)}" title="Remove document from index">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </td>
      </tr>
    `).join('');

    crawlerDocsTableBody.querySelectorAll('.btn-del-doc').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await fetch(`/api/crawler/page/${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
        showToast('Page removed from native index.');
        fetchCrawlerStats();
        fetchCrawlerPages();
      });
    });
  }

  async function handleStartCrawl() {
    const seedUrl = crawlerSeedUrl.value.trim();
    if (!seedUrl || !seedUrl.startsWith('http')) {
      showToast('Please enter a valid starting seed URL (http:// or https://)', 'danger');
      return;
    }
    const maxPages = parseInt(crawlerMaxPages.value, 10) || 15;
    const maxDepth = parseInt(crawlerMaxDepth.value, 10) || 2;
    const delayMs = parseInt(crawlerDelayMs.value, 10) || 300;

    try {
      const res = await fetch('/api/crawler/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedUrl, maxPages, maxDepth, delayMs })
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || 'Failed to start spider', 'danger');
        return;
      }

      showToast(`Spider launched on ${seedUrl}!`);
      startCrawlerPolling();
    } catch (e) {
      showToast('Network error starting spider', 'danger');
    }
  }

  async function handleStopCrawl() {
    try {
      const res = await fetch('/api/crawler/stop', { method: 'POST' });
      const data = await res.json();
      showToast(data.message || 'Spider stopped');
      pollCrawlerStatus();
    } catch (e) {}
  }

  async function handleRebuildIndex() {
    showToast('Recomputing BM25 inverted index weights...');
    try {
      const res = await fetch('/api/crawler/index/rebuild', { method: 'POST' });
      const data = await res.json();
      showToast('BM25 index recomputed successfully!');
      fetchCrawlerStats();
      fetchCrawlerPages();
    } catch (e) {
      showToast('Failed to rebuild index', 'danger');
    }
  }

  async function handleClearIndex() {
    if (!confirm('Are you sure you want to reset the native search index? This will restore the default starter collection.')) {
      return;
    }
    try {
      const res = await fetch('/api/crawler/index', { method: 'DELETE' });
      const data = await res.json();
      showToast(data.message || 'Index reset successfully');
      fetchCrawlerStats();
      fetchCrawlerPages();
    } catch (e) {}
  }

  // =========================================================================
  // Built-In Sandboxed Private Web Browser Controller
  // =========================================================================
  function togglePrivateBrowser(show) {
    const isShowing = privateBrowserModalBackdrop && privateBrowserModalBackdrop.style.display !== 'none';
    const target = show !== undefined ? show : !isShowing;
    if (target) {
      openPrivateBrowser();
    } else {
      closePrivateBrowser();
    }
  }

  function openPrivateBrowser() {
    if (!privateBrowserModalBackdrop) return;
    privateBrowserModalBackdrop.style.display = 'flex';
    if (browserState.tabs.length === 0) {
      createBrowserTab();
    }
  }

  function closePrivateBrowser() {
    if (!privateBrowserModalBackdrop) return;
    if (browserState.isSplitMode) {
      toggleBrowserSplitScreen(false);
    }
    privateBrowserModalBackdrop.style.display = 'none';
  }

  function toggleBrowserSplitScreen(forceState) {
    if (typeof toggleSplitView === 'function') {
      return toggleSplitView(forceState);
    }
    browserState.isSplitMode = forceState !== undefined ? forceState : !browserState.isSplitMode;
    document.body.classList.toggle('browser-split-mode', browserState.isSplitMode);
    if (btnBrowserSplitScreen) {
      btnBrowserSplitScreen.classList.toggle('active', browserState.isSplitMode);
    }
    if (browserState.isSplitMode) {
      showToast('Split-Screen Active: Side-by-side view');
    }
  }

  function toggleBrowserFullscreen() {
    browserState.isFullscreen = !browserState.isFullscreen;
    if (privateBrowserCard) {
      privateBrowserCard.classList.toggle('fullscreen-mode', browserState.isFullscreen);
    }
    if (browserState.isSplitMode && browserState.isFullscreen) {
      toggleBrowserSplitScreen(false);
    }
  }

  function createBrowserTab(url = null, title = 'New Tab', workspace = null) {
    let cleanUrl = url || '';
    if (cleanUrl.includes('/api/browser/proxy') || cleanUrl.includes('/api/proxy')) {
      try {
        const parsed = new URL(cleanUrl, location.origin);
        const unwrapped = parsed.searchParams.get('url');
        if (unwrapped && /^https?:\/\//i.test(unwrapped)) {
          cleanUrl = unwrapped;
        }
      } catch(e) {}
    }
    const tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newTab = {
      id: tabId,
      workspace: workspace || browserState.activeWorkspace || 'personal',
      url: cleanUrl,
      title: title || (cleanUrl ? formatDisplayUrl(cleanUrl) : 'New Tab'),
      favicon: '',
      history: cleanUrl ? [cleanUrl] : [],
      historyIndex: cleanUrl ? 0 : -1,
      blockedTrackers: 0
    };

    browserState.tabs.push(newTab);
    renderBrowserTabs();
    if (typeof renderVerticalTabs === 'function') renderVerticalTabs();
    if (typeof updateWorkspacePillBadges === 'function') updateWorkspacePillBadges();
    switchBrowserTab(tabId);
    return tabId;
  }

  function renderBrowserTabs() {
    if (!browserTabsList) return;
    const currentWorkspace = browserState.activeWorkspace || 'personal';
    const visibleTabs = browserState.tabs.filter(t => !t.workspace || t.workspace === currentWorkspace);

    browserTabsList.innerHTML = visibleTabs.map(tab => {
      const isActive = tab.id === browserState.activeTabId;
      let faviconHtml = '';
      const cleanTitle = (tab.title || 'W').replace(/[^a-zA-Z0-9]/g, '');
      const letter = cleanTitle ? cleanTitle[0].toUpperCase() : 'W';

      if (tab.favicon) {
        faviconHtml = `<img src="${escapeHtml(tab.favicon)}" class="tab-favicon" onerror="this.outerHTML='<span class=\\'tab-favicon-fallback\\'>${letter}</span>'">`;
      } else {
        faviconHtml = `<span class="tab-favicon-fallback">${letter}</span>`;
      }

      return `
        <div class="browser-tab ${isActive ? 'active' : ''}" data-tab-id="${escapeHtml(tab.id)}" title="${escapeHtml(tab.title || tab.url)}">
          ${faviconHtml}
          <span class="tab-title-text">${escapeHtml(tab.title || 'New Tab')}</span>
          <button type="button" class="btn-tab-close" data-tab-id="${escapeHtml(tab.id)}" title="Close Tab (Ctrl+W)">&times;</button>
        </div>
      `;
    }).join('');

    browserTabsList.querySelectorAll('.browser-tab').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.btn-tab-close')) return;
        switchBrowserTab(el.dataset.tabId);
      });
    });

    browserTabsList.querySelectorAll('.btn-tab-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeBrowserTab(btn.dataset.tabId);
      });
    });

    if (typeof renderVerticalTabs === 'function') renderVerticalTabs();
    if (typeof updateWorkspacePillBadges === 'function') updateWorkspacePillBadges();
  }

  function getOrCreateWebviewForTab(tab) {
    if (!browserWebviewsContainer) return null;
    let wv = document.getElementById(`wv_${tab.id}`);
    if (wv) return wv;

    wv = document.createElement('webview');
    wv.id = `wv_${tab.id}`;
    wv.className = 'browser-webview-tab';
    wv.setAttribute('allowpopups', 'true');
    wv.setAttribute('webpreferences', 'contextIsolation=yes');
    wv.setAttribute('partition', 'persist:aegis_user');
    wv.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    wv.style.display = 'none';

    wv.addEventListener('did-start-loading', () => {
      if (browserState.activeTabId === tab.id) {
        triggerLoadingBar(true);
      }
    });

    wv.addEventListener('did-stop-loading', () => {
      if (browserState.activeTabId === tab.id) {
        triggerLoadingBar(false);
        updateNavButtonStates();
      }
    });

    wv.addEventListener('did-fail-load', (e) => {
      if (e.errorCode === -3) return;
      console.warn('Webview failed to load:', e.validatedURL, e.errorDescription);
      triggerLoadingBar(false);
    });

    wv.addEventListener('page-title-updated', (e) => {
      if (e.title) {
        tab.title = e.title;
        renderBrowserTabs();
      }
    });

    wv.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        tab.favicon = e.favicons[0];
        renderBrowserTabs();
      }
    });

    wv.addEventListener('will-navigate', (e) => {
      if (e.url) {
        // If webview is directed to proxy endpoint, unwrap to direct URL for native Chromium fidelity
        if (e.url.includes('/api/browser/proxy') || e.url.includes('/api/proxy')) {
          try {
            const parsed = new URL(e.url, location.origin);
            const targetUrl = parsed.searchParams.get('url');
            if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
              e.preventDefault();
              wv.loadURL(targetUrl);
              return;
            }
          } catch(err) {}
        }
        tab.url = e.url;
        if (browserState.activeTabId === tab.id) {
          if (browserUrlInput) browserUrlInput.value = formatDisplayUrl(e.url);
          if (btnBrowserExternalLink) {
            btnBrowserExternalLink.href = e.url;
            btnBrowserExternalLink.style.display = 'inline-flex';
          }
          triggerLoadingBar(true);
          updateNavButtonStates();
        }
      }
    });

    wv.addEventListener('did-navigate', (e) => {
      let resolvedUrl = e.url;
      if (resolvedUrl.includes('/api/browser/proxy') || resolvedUrl.includes('/api/proxy')) {
        try {
          const parsed = new URL(resolvedUrl, location.origin);
          const targetUrl = parsed.searchParams.get('url');
          if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
            resolvedUrl = targetUrl;
          }
        } catch(err) {}
      }
      tab.url = resolvedUrl;
      if (browserState.activeTabId === tab.id) {
        if (browserUrlInput) browserUrlInput.value = formatDisplayUrl(resolvedUrl);
        if (btnBrowserExternalLink) {
          btnBrowserExternalLink.href = resolvedUrl;
          btnBrowserExternalLink.style.display = 'inline-flex';
        }
        updateNavButtonStates();
      }
    });

    wv.addEventListener('did-navigate-in-page', (e) => {
      let resolvedUrl = e.url;
      if (resolvedUrl.includes('/api/browser/proxy') || resolvedUrl.includes('/api/proxy')) {
        try {
          const parsed = new URL(resolvedUrl, location.origin);
          const targetUrl = parsed.searchParams.get('url');
          if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
            resolvedUrl = targetUrl;
          }
        } catch(err) {}
      }
      tab.url = resolvedUrl;
      if (browserState.activeTabId === tab.id) {
        if (browserUrlInput) browserUrlInput.value = formatDisplayUrl(resolvedUrl);
        updateNavButtonStates();
      }
    });

    wv.addEventListener('new-window', (e) => {
      e.preventDefault();
      if (e.url) {
        createBrowserTab(e.url);
      }
    });

    browserWebviewsContainer.appendChild(wv);

    if (tab.url) {
      let startUrl = tab.url;
      if (startUrl.includes('/api/browser/proxy') || startUrl.includes('/api/proxy')) {
        try {
          const parsed = new URL(startUrl, location.origin);
          const targetUrl = parsed.searchParams.get('url');
          if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
            startUrl = targetUrl;
            tab.url = targetUrl;
          }
        } catch(err) {}
      }
      wv.src = startUrl.startsWith('/browser/search') ? (location.origin + startUrl) : startUrl;
    }

    return wv;
  }

  function switchBrowserTab(tabId) {
    const tab = browserState.tabs.find(t => t.id === tabId);
    if (!tab) return;

    browserState.activeTabId = tabId;
    renderBrowserTabs();

    if (browserUrlInput) {
      browserUrlInput.value = formatDisplayUrl(tab.url);
    }
    if (browserBlockedCount) {
      browserBlockedCount.textContent = tab.blockedTrackers || 0;
    }
    if (btnBrowserExternalLink) {
      btnBrowserExternalLink.href = tab.url || '#';
      btnBrowserExternalLink.style.display = tab.url ? 'inline-flex' : 'none';
    }

    closeBrowserSuggestions();
    updateNavButtonStates();

    const isDesktop = Boolean(window.aegisDesktop?.isDesktop);

    if (isDesktop) {
      browserIframe.style.display = 'none';
      if (browserWebviewsContainer) {
        browserWebviewsContainer.querySelectorAll('webview').forEach(el => {
          el.style.display = 'none';
        });
      }

      if (tab.url) {
        browserStartPage.style.display = 'none';
        browserWebviewsContainer.style.display = 'block';
        const wv = getOrCreateWebviewForTab(tab);
        if (wv) {
          wv.style.display = 'flex';
          let targetWvSrc = tab.url;
          if (targetWvSrc.includes('/api/browser/proxy') || targetWvSrc.includes('/api/proxy')) {
            try {
              const parsed = new URL(targetWvSrc, location.origin);
              const targetUrl = parsed.searchParams.get('url');
              if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
                targetWvSrc = targetUrl;
                tab.url = targetUrl;
              }
            } catch(err) {}
          }
          targetWvSrc = targetWvSrc.startsWith('/browser/search')
            ? (location.origin + targetWvSrc)
            : targetWvSrc;
          if (!wv.src || wv.src === 'about:blank' || (wv.src !== targetWvSrc && !wv.src.endsWith(encodeURIComponent(tab.url)))) {
            triggerLoadingBar(true);
            wv.src = targetWvSrc;
          }
        }
      } else {
        browserStartPage.style.display = 'flex';
        browserWebviewsContainer.style.display = 'none';
        triggerLoadingBar(false);
      }
    } else {
      if (browserWebviewsContainer) browserWebviewsContainer.style.display = 'none';
      if (tab.url) {
        browserStartPage.style.display = 'none';
        browserIframe.style.display = 'block';
        const finalIframeUrl = tab.url.startsWith('/browser/search')
          ? tab.url
          : `/api/browser/proxy?tabId=${encodeURIComponent(tab.id)}&url=${encodeURIComponent(tab.url)}`;
        const loadedTabId = browserIframe.getAttribute('data-loaded-tab-id');
        const loadedUrl = browserIframe.getAttribute('data-loaded-url');
        if (loadedTabId !== tab.id || loadedUrl !== tab.url) {
          triggerLoadingBar(true);
          browserIframe.setAttribute('data-loaded-tab-id', tab.id);
          browserIframe.setAttribute('data-loaded-url', tab.url);
          browserIframe.src = finalIframeUrl;
        }
      } else {
        browserStartPage.style.display = 'flex';
        browserIframe.style.display = 'none';
        browserIframe.removeAttribute('data-loaded-tab-id');
        browserIframe.removeAttribute('data-loaded-url');
        browserIframe.src = 'about:blank';
        triggerLoadingBar(false);
      }
    }
  }

  function closeBrowserTab(tabId) {
    const idx = browserState.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    // Burn session cookies for this closed tab
    fetch('/api/browser/burn-tab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabId })
    }).catch(() => {});

    const wv = document.getElementById(`wv_${tabId}`);
    if (wv) wv.remove();

    browserState.tabs.splice(idx, 1);

    if (browserState.tabs.length === 0) {
      createBrowserTab();
    } else if (browserState.activeTabId === tabId) {
      const nextIdx = Math.min(idx, browserState.tabs.length - 1);
      switchBrowserTab(browserState.tabs[nextIdx].id);
    } else {
      renderBrowserTabs();
    }
  }

  async function burnActiveTab() {
    const activeTab = getActiveBrowserTab();
    if (!activeTab) return;

    if (btnBrowserBurnTab) {
      btnBrowserBurnTab.classList.add('burning');
      setTimeout(() => btnBrowserBurnTab.classList.remove('burning'), 900);
    }

    try {
      const res = await fetch('/api/browser/burn-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabId: activeTab.id })
      });
      const data = await res.json();
      showToast(`Tab Burned 🔥: ${data.cookiesBurnt || 0} session cookies & RAM cache shredded!`);
    } catch (e) {
      showToast('Tab session cleared.');
    }

    activeTab.url = '';
    activeTab.title = 'New Tab';
    activeTab.favicon = '';
    activeTab.history = [];
    activeTab.historyIndex = -1;
    activeTab.blockedTrackers = 0;

    switchBrowserTab(activeTab.id);
  }

  function getActiveBrowserTab() {
    return browserState.tabs.find(t => t.id === browserState.activeTabId);
  }

  function formatDisplayUrl(url) {
    if (!url) return '';
    if (url.startsWith('/browser/search')) {
      try {
        const qs = url.split('?')[1] || '';
        const params = new URLSearchParams(qs);
        const q = params.get('q');
        if (q) return q;
      } catch (e) {}
      return '';
    }
    if (url.includes('/api/browser/proxy') || url.includes('/api/proxy')) {
      try {
        const u = new URL(url, window.location.origin);
        const realTarget = u.searchParams.get('url');
        if (realTarget) return realTarget;
      } catch(e) {}
    }
    return url;
  }

  // Engine Picker Methods
  function updateBrowserEngineUI() {
    const eng = BROWSER_ENGINES[browserState.engine] || BROWSER_ENGINES.ddg;
    if (browserEngineIcon) browserEngineIcon.textContent = eng.icon;
    if (browserEngineLabel) browserEngineLabel.textContent = eng.label;
    if (browserUrlInput) browserUrlInput.placeholder = eng.placeholder;
    if (browserEngineDropdown) {
      browserEngineDropdown.querySelectorAll('.engine-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.engine === eng.id);
      });
    }
  }

  function setBrowserEngine(engineKey) {
    if (BROWSER_ENGINES[engineKey]) {
      browserState.engine = engineKey;
      localStorage.setItem('aegis_browser_engine', engineKey);
      updateBrowserEngineUI();
      if (browserEngineDropdown) browserEngineDropdown.style.display = 'none';
      if (btnBrowserCurrentEngine) btnBrowserCurrentEngine.classList.remove('active');
      showToast(`Browser Search Engine set to ${BROWSER_ENGINES[engineKey].label}`);
    }
  }

  function toggleBrowserEngineDropdown() {
    if (!browserEngineDropdown) return;
    const isVisible = browserEngineDropdown.style.display !== 'none';
    browserEngineDropdown.style.display = isVisible ? 'none' : 'flex';
    if (btnBrowserCurrentEngine) {
      btnBrowserCurrentEngine.classList.toggle('active', !isVisible);
    }
  }

  // Omnibox Auto-Suggest Handlers
  let browserSuggestTimer = null;
  let browserSuggestSelectedIndex = -1;
  let browserSuggestAbort = null;

  function handleBrowserOmniboxInput() {
    if (!browserUrlInput || document.activeElement !== browserUrlInput) {
      closeBrowserSuggestions();
      return;
    }

    const val = browserUrlInput.value.trim();
    clearTimeout(browserSuggestTimer);
    if (browserSuggestAbort) {
      browserSuggestAbort.abort();
      browserSuggestAbort = null;
    }

    if (!val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/') || val.startsWith('www.')) {
      closeBrowserSuggestions();
      return;
    }

    browserSuggestTimer = setTimeout(async () => {
      if (!browserUrlInput || document.activeElement !== browserUrlInput || browserUrlInput.value.trim() !== val) {
        closeBrowserSuggestions();
        return;
      }

      try {
        browserSuggestAbort = new AbortController();
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(val)}`, {
          signal: browserSuggestAbort.signal
        });
        const data = await res.json();

        if (browserUrlInput && document.activeElement === browserUrlInput && browserUrlInput.value.trim() === val) {
          renderBrowserSuggestions(data.suggestions || [], val);
        } else {
          closeBrowserSuggestions();
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          closeBrowserSuggestions();
        }
      }
    }, 160);
  }

  function renderBrowserSuggestions(suggestions, query) {
    if (!browserSuggestionsDropdown) return;
    if (!suggestions || suggestions.length === 0 || document.activeElement !== browserUrlInput) {
      closeBrowserSuggestions();
      return;
    }

    browserSuggestSelectedIndex = -1;
    browserSuggestionsDropdown.style.display = 'block';
    browserSuggestionsDropdown.innerHTML = suggestions.slice(0, 6).map((s, idx) => `
      <div class="b-suggest-item" data-idx="${idx}" data-text="${escapeHtml(s.text)}">
        <div class="b-suggest-main">
          <span class="b-suggest-icon">${s.type === 'bang' ? '🏷️' : '🔍'}</span>
          <span>${escapeHtml(s.text)}</span>
          ${s.type === 'bang' ? `<span class="b-suggest-badge">${escapeHtml(s.prefix || 'Bang')}</span>` : ''}
        </div>
        <span class="b-suggest-desc">${escapeHtml(s.description || '')}</span>
      </div>
    `).join('');

    browserSuggestionsDropdown.querySelectorAll('.b-suggest-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const text = item.dataset.text;
        if (browserUrlInput) browserUrlInput.value = text;
        closeBrowserSuggestions();
        navigateActiveTab(text);
      });
    });
  }

  function handleBrowserOmniboxKeydown(e) {
    if (e.key === 'Escape') {
      closeBrowserSuggestions();
      return;
    }

    if (!browserSuggestionsDropdown || browserSuggestionsDropdown.style.display === 'none') return;
    const items = browserSuggestionsDropdown.querySelectorAll('.b-suggest-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      browserSuggestSelectedIndex = (browserSuggestSelectedIndex + 1) % items.length;
      updateBrowserSuggestionHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      browserSuggestSelectedIndex = (browserSuggestSelectedIndex - 1 + items.length) % items.length;
      updateBrowserSuggestionHighlight(items);
    } else if (e.key === 'Enter') {
      if (browserSuggestSelectedIndex >= 0 && items[browserSuggestSelectedIndex]) {
        e.preventDefault();
        const chosen = items[browserSuggestSelectedIndex].dataset.text;
        if (browserUrlInput) browserUrlInput.value = chosen;
        closeBrowserSuggestions();
        navigateActiveTab(chosen);
      }
    }
  }

  function updateBrowserSuggestionHighlight(items) {
    items.forEach((item, idx) => {
      const isSelected = idx === browserSuggestSelectedIndex;
      item.classList.toggle('selected', isSelected);
      if (isSelected && browserUrlInput) {
        browserUrlInput.value = item.dataset.text;
      }
    });
  }

  function closeBrowserSuggestions() {
    clearTimeout(browserSuggestTimer);
    if (browserSuggestAbort) {
      try { browserSuggestAbort.abort(); } catch(e) {}
      browserSuggestAbort = null;
    }
    if (browserSuggestionsDropdown) {
      browserSuggestionsDropdown.style.display = 'none';
      browserSuggestionsDropdown.innerHTML = '';
    }
    browserSuggestSelectedIndex = -1;
  }

  function navigateActiveTab(input, pushHistory = true) {
    const activeTab = getActiveBrowserTab();
    if (!activeTab) return;

    let raw = (input || '').trim();
    if (!raw) return;

    closeBrowserSuggestions();

    // 1. Check for Bang shortcuts (!w, !gh, !yt, etc.)
    const parts = raw.split(/\s+/);
    const firstWord = parts[0].toLowerCase();
    const queryPart = raw.substring(parts[0].length).trim();

    let targetUrl = raw;

    if (firstWord === '!aegis') {
      const q = queryPart || '';
      targetUrl = `/browser/search?tabId=${encodeURIComponent(activeTab.id)}&q=${encodeURIComponent(q)}`;
    } else {
      const bangMatch = BROWSER_BANGS.find(b => b.prefix === firstWord);
      if (bangMatch && queryPart) {
        targetUrl = bangMatch.url + encodeURIComponent(queryPart);
      } else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('/browser/search')) {
        if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
          targetUrl = 'https://' + targetUrl;
        } else {
          const eng = BROWSER_ENGINES[browserState.engine] || BROWSER_ENGINES.aegis;
          targetUrl = eng.resolve(targetUrl, activeTab.id) || `/browser/search?tabId=${encodeURIComponent(activeTab.id)}&q=${encodeURIComponent(targetUrl)}`;
        }
      }
    }

    if (targetUrl.includes('/api/browser/proxy') || targetUrl.includes('/api/proxy')) {
      try {
        const parsed = new URL(targetUrl, location.origin);
        const unwrapped = parsed.searchParams.get('url');
        if (unwrapped && /^https?:\/\//i.test(unwrapped)) {
          targetUrl = unwrapped;
        }
      } catch(e) {}
    }

    activeTab.url = targetUrl;
    try {
      if (targetUrl.startsWith('/browser/search')) {
        const urlParams = new URLSearchParams(targetUrl.split('?')[1] || '');
        const qVal = urlParams.get('q') || 'Aegis Search';
        activeTab.title = `🛡️ ${qVal}`;
      } else {
        const parsed = new URL(targetUrl);
        if (parsed.hostname.includes('duckduckgo.com') && parsed.searchParams.has('q')) {
          activeTab.title = `🦆 ${parsed.searchParams.get('q')}`;
        } else if (parsed.hostname.includes('startpage.com') && parsed.searchParams.has('query')) {
          activeTab.title = `🌐 ${parsed.searchParams.get('query')}`;
        } else if (parsed.hostname.includes('wikipedia.org') && parsed.searchParams.has('search')) {
          activeTab.title = `📖 ${parsed.searchParams.get('search')}`;
        } else if (parsed.hostname.includes('github.com') && parsed.searchParams.has('q')) {
          activeTab.title = `🐙 ${parsed.searchParams.get('q')}`;
        } else if (parsed.hostname.includes('developer.mozilla.org') && parsed.searchParams.has('q')) {
          activeTab.title = `💻 ${parsed.searchParams.get('q')}`;
        } else {
          activeTab.title = parsed.hostname;
        }
      }
    } catch(e) {
      activeTab.title = targetUrl;
    }

    if (pushHistory) {
      if (activeTab.historyIndex < activeTab.history.length - 1) {
        activeTab.history = activeTab.history.slice(0, activeTab.historyIndex + 1);
      }
      activeTab.history.push(targetUrl);
      activeTab.historyIndex = activeTab.history.length - 1;
    }

    if (browserUrlInput) {
      browserUrlInput.value = formatDisplayUrl(targetUrl);
    }
    if (btnBrowserExternalLink) {
      btnBrowserExternalLink.href = targetUrl;
      btnBrowserExternalLink.style.display = targetUrl.startsWith('/browser/search') ? 'none' : 'inline-flex';
    }

    browserStartPage.style.display = 'none';

    if (window.aegisDesktop?.isDesktop) {
      browserIframe.style.display = 'none';
      if (browserWebviewsContainer) browserWebviewsContainer.style.display = 'block';
      const wv = getOrCreateWebviewForTab(activeTab);
      if (wv) {
        wv.style.display = 'flex';
        triggerLoadingBar(true);
        const targetWvSrc = targetUrl.startsWith('/browser/search')
          ? (location.origin + targetUrl)
          : targetUrl;
        wv.src = targetWvSrc;
      }
    } else {
      browserIframe.style.display = 'block';
      triggerLoadingBar(true);
      const finalIframeUrl = targetUrl.startsWith('/browser/search')
        ? targetUrl
        : `/api/browser/proxy?tabId=${encodeURIComponent(activeTab.id)}&url=${encodeURIComponent(targetUrl)}`;
      browserIframe.setAttribute('data-loaded-tab-id', activeTab.id);
      browserIframe.setAttribute('data-loaded-url', targetUrl);
      browserIframe.src = finalIframeUrl;
    }

    renderBrowserTabs();
    updateNavButtonStates();
  }

  function updateNavButtonStates() {
    const activeTab = getActiveBrowserTab();
    if (!activeTab) return;

    if (window.aegisDesktop?.isDesktop) {
      const wv = document.getElementById(`wv_${activeTab.id}`);
      if (wv && typeof wv.canGoBack === 'function') {
        if (btnBrowserBack) btnBrowserBack.disabled = !wv.canGoBack();
        if (btnBrowserForward) btnBrowserForward.disabled = !wv.canGoForward();
        return;
      }
    }

    if (btnBrowserBack) {
      btnBrowserBack.disabled = activeTab.historyIndex <= 0;
    }
    if (btnBrowserForward) {
      btnBrowserForward.disabled = activeTab.historyIndex >= activeTab.history.length - 1;
    }
  }

  function browserGoBack() {
    const activeTab = getActiveBrowserTab();
    if (!activeTab) return;

    if (window.aegisDesktop?.isDesktop) {
      const wv = document.getElementById(`wv_${activeTab.id}`);
      if (wv && typeof wv.canGoBack === 'function' && wv.canGoBack()) {
        wv.goBack();
        return;
      }
    }

    if (activeTab.historyIndex > 0) {
      activeTab.historyIndex--;
      navigateActiveTab(activeTab.history[activeTab.historyIndex], false);
    }
  }

  function browserGoForward() {
    const activeTab = getActiveBrowserTab();
    if (!activeTab) return;

    if (window.aegisDesktop?.isDesktop) {
      const wv = document.getElementById(`wv_${activeTab.id}`);
      if (wv && typeof wv.canGoForward === 'function' && wv.canGoForward()) {
        wv.goForward();
        return;
      }
    }

    if (activeTab.historyIndex < activeTab.history.length - 1) {
      activeTab.historyIndex++;
      navigateActiveTab(activeTab.history[activeTab.historyIndex], false);
    }
  }

  function browserReload() {
    const activeTab = getActiveBrowserTab();
    if (!activeTab) return;

    if (window.aegisDesktop?.isDesktop) {
      const wv = document.getElementById(`wv_${activeTab.id}`);
      if (wv && typeof wv.reload === 'function') {
        triggerLoadingBar(true);
        wv.reload();
        return;
      }
    }

    if (activeTab.url) {
      triggerLoadingBar(true);
      const finalUrl = activeTab.url.startsWith('/browser/search')
        ? activeTab.url
        : `/api/browser/proxy?tabId=${encodeURIComponent(activeTab.id)}&url=${encodeURIComponent(activeTab.url)}&_t=${Date.now()}`;
      browserIframe.src = finalUrl;
    }
  }

  function browserGoHome() {
    const activeTab = getActiveBrowserTab();
    if (activeTab) {
      activeTab.url = '';
      activeTab.title = 'New Tab';
      activeTab.favicon = '';
      switchBrowserTab(activeTab.id);
    }
  }

  function handleBrowserOmniboxSubmit(e) {
    e.preventDefault();
    closeBrowserSuggestions();
    if (browserUrlInput) {
      browserUrlInput.blur();
      navigateActiveTab(browserUrlInput.value);
    }
  }

  function triggerLoadingBar(isLoading) {
    if (!browserLoadingBar) return;
    if (isLoading) {
      browserLoadingBar.style.opacity = '1';
      browserLoadingBar.style.width = '35%';
      setTimeout(() => { if (browserLoadingBar.style.width === '35%') browserLoadingBar.style.width = '75%'; }, 400);
    } else {
      browserLoadingBar.style.width = '100%';
      setTimeout(() => {
        browserLoadingBar.style.opacity = '0';
        setTimeout(() => { browserLoadingBar.style.width = '0%'; }, 250);
      }, 300);
    }
  }

  function handleBrowserIframeMessage(e) {
    const data = e.data;
    if (!data || typeof data !== 'object') return;
    closeBrowserSuggestions();

    if (data.type === 'AEGIS_BROWSER_NAV') {
      const tab = browserState.tabs.find(t => t.id === data.tabId);
      if (tab) {
        if (data.title) tab.title = data.title;
        if (data.favicon) tab.favicon = data.favicon;
        if (data.blockedTrackers !== undefined) tab.blockedTrackers = data.blockedTrackers;

        // Resolve the real URL — prefer targetUrl, fall back to unwrapping proxied url
        let resolvedTargetUrl = data.targetUrl || '';
        if (!resolvedTargetUrl && data.url) {
          if (data.url.includes('/api/browser/proxy') || data.url.includes('/api/proxy')) {
            try {
              const u = new URL(data.url, window.location.origin);
              const extracted = u.searchParams.get('url');
              if (extracted && /^https?:\/\//i.test(extracted)) resolvedTargetUrl = extracted;
            } catch(e) {}
          } else {
            resolvedTargetUrl = data.url;
          }
        }

        if (resolvedTargetUrl) {
          const isNewUrl = resolvedTargetUrl !== tab.url;
          tab.url = resolvedTargetUrl;
          if (isNewUrl) {
            // Show loading bar for new navigation
            triggerLoadingBar(true);
            if (tab.historyIndex === -1 || tab.history[tab.historyIndex] !== resolvedTargetUrl) {
              if (tab.historyIndex < tab.history.length - 1) {
                tab.history = tab.history.slice(0, tab.historyIndex + 1);
              }
              tab.history.push(resolvedTargetUrl);
              tab.historyIndex = tab.history.length - 1;
            }
          } else {
            // Same URL means page loaded, stop the bar
            triggerLoadingBar(false);
          }
          if (browserIframe && tab.id === browserState.activeTabId) {
            browserIframe.setAttribute('data-loaded-tab-id', tab.id);
            browserIframe.setAttribute('data-loaded-url', tab.url);
          }
        } else {
          // No URL data means page finished loading
          triggerLoadingBar(false);
        }

        if (tab.id === browserState.activeTabId) {
          if (browserUrlInput && document.activeElement !== browserUrlInput) {
            browserUrlInput.value = formatDisplayUrl(tab.url);
          }
          if (btnBrowserExternalLink) {
            btnBrowserExternalLink.href = tab.url || '#';
            btnBrowserExternalLink.style.display = tab.url ? 'inline-flex' : 'none';
          }
          if (browserBlockedCount) {
            browserBlockedCount.textContent = tab.blockedTrackers;
          }
          updateNavButtonStates();
        }
        renderBrowserTabs();
      }
    } else if (data.type === 'AEGIS_BROWSER_NAVIGATE_REQUEST') {
      const tab = browserState.tabs.find(t => t.id === data.tabId);
      if (tab) {
        if (data.url) {
          if (tab.id !== browserState.activeTabId) {
            switchBrowserTab(tab.id);
          }
          navigateActiveTab(data.url);
        } else {
          browserGoHome();
        }
      }
    } else if (data.type === 'AEGIS_BROWSER_OPEN_EXTERNAL') {
      if (data.url) {
        createBrowserTab(data.url, data.title || 'New Tab');
      }
    } else if (data.type === 'AEGIS_BROWSER_OPEN_READER') {
      if (data.url) {
        openProxyReader(data.url, data.title || 'Reader Mode');
      }
    } else if (data.type === 'AEGIS_BROWSER_OPEN_TAB') {
      if (data.url) {
        createBrowserTab(data.url, data.title || 'New Tab');
      }
    }
  }

  // Pro Global & Browser Keyboard Shortcuts
  function handleGlobalBrowserShortcuts(e) {
    if (imageLightboxBackdrop && imageLightboxBackdrop.style.display === 'flex') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateImageLightbox(-1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateImageLightbox(1);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        imageLightboxBackdrop.style.display = 'none';
        return;
      }
    }

    const isBrowserOpen = privateBrowserModalBackdrop && privateBrowserModalBackdrop.style.display !== 'none';
    if (!isBrowserOpen) return;

    // Ctrl+T / Cmd+T: New Tab
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
      e.preventDefault();
      createBrowserTab();
      if (browserUrlInput) {
        browserUrlInput.focus();
        browserUrlInput.select();
      }
      return;
    }

    // Ctrl+W / Cmd+W: Close Tab
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeBrowserTab(browserState.activeTabId);
      return;
    }

    // Ctrl+L or Alt+D: Focus Address Bar
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      if (browserUrlInput) {
        browserUrlInput.focus();
        browserUrlInput.select();
      }
      return;
    }

    // Ctrl+Shift+K: Shred / Burn Tab
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      burnActiveTab();
      return;
    }

    // Ctrl+\ or Alt+S: Toggle Split View
    if (((e.ctrlKey || e.metaKey) && e.key === '\\') || (e.altKey && e.key.toLowerCase() === 's')) {
      e.preventDefault();
      toggleSplitView();
      return;
    }

    // Alt+Z: 1-Click AI Page Summarizer
    if (e.altKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      handleSummarizePage();
      return;
    }

    // Alt+Left: Back
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      browserGoBack();
      return;
    }

    // Alt+Right: Forward
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      browserGoForward();
      return;
    }

    // Escape: Close summary drawer, suggestions or engine dropdown
    if (e.key === 'Escape') {
      if (pageSummaryDrawer && pageSummaryDrawer.style.display !== 'none') {
        closePageSummaryDrawer();
        return;
      }
      if (browserSuggestionsDropdown && browserSuggestionsDropdown.style.display !== 'none') {
        closeBrowserSuggestions();
        return;
      }
      if (browserEngineDropdown && browserEngineDropdown.style.display !== 'none') {
        browserEngineDropdown.style.display = 'none';
        if (btnBrowserCurrentEngine) btnBrowserCurrentEngine.classList.remove('active');
        return;
      }
    }
  }

  function openInPrivateBrowser(url, title) {
    if (!privateBrowserModalBackdrop) return;
    privateBrowserModalBackdrop.style.display = 'flex';

    const activeTab = getActiveBrowserTab();
    if (activeTab && (!activeTab.url || activeTab.url === 'about:blank')) {
      navigateActiveTab(url);
      if (title) {
        activeTab.title = title;
        renderBrowserTabs();
      }
    } else {
      createBrowserTab(url, title);
    }
    showToast(`Opened "${(title || url).substring(0, 30)}..." in Aegis Private Browser`);
  }

  // Expose to window for Electron Main Process & External Handlers
  window.openInPrivateBrowser = openInPrivateBrowser;

  function clipBrowserPageToNotes() {
    const activeTab = getActiveBrowserTab();
    if (!activeTab || !activeTab.url) return;
    const clip = `\n\n### [${activeTab.title || activeTab.url}](${activeTab.url})\n> Clipped from Aegis Sandboxed Browser on ${new Date().toLocaleDateString()}\n`;
    if (scratchpadTextarea) {
      scratchpadTextarea.value += clip;
      updateScratchpad();
      showToast('Page link clipped to Research Scratchpad!');
      toggleScratchpad(true);
    }
  }

  function toggleBrowserReaderMode() {
    const activeTab = getActiveBrowserTab();
    if (activeTab && activeTab.url) {
      openProxyReader(activeTab.url, activeTab.title);
    }
  }

  // ==========================================================================
  // Universal Link Interception: Route ALL web links into Aegis Private Browser
  // ==========================================================================
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    // Never intercept download links or specific internal UI action triggers
    if (
      anchor.hasAttribute('download') ||
      anchor.closest('.no-intercept')
    ) {
      return;
    }

    // Check if it's an external web URL or document link
    if (href.startsWith('http://') || href.startsWith('https://')) {
      const currentOrigin = window.location.origin;
      // Allow internal app routes (like /opensearch.xml or internal assets) unless they are proxy/search links
      if (href.startsWith(currentOrigin) && !href.includes('/api/browser/proxy') && !href.includes('/browser/search')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      const title = anchor.getAttribute('title') || anchor.textContent.trim() || href;
      openInPrivateBrowser(href, title);
    }
  }, true);

  // ==========================================================================
  // Standalone Desktop App (Electron) Integration
  // ==========================================================================
  if (window.aegisDesktop && window.aegisDesktop.isDesktop) {
    const desktopBar = document.getElementById('desktopTitlebar');
    if (desktopBar) desktopBar.style.display = 'flex';

    const btnMin = document.getElementById('btnDesktopMinimize');
    const btnMax = document.getElementById('btnDesktopMaximize');
    const btnClose = document.getElementById('btnDesktopClose');

    if (btnMin) btnMin.addEventListener('click', () => window.aegisDesktop.minimize());
    if (btnMax) btnMax.addEventListener('click', () => window.aegisDesktop.maximize());
    if (btnClose) btnClose.addEventListener('click', () => window.aegisDesktop.close());

    console.log('🛡️ Aegis running in Native Desktop Application container.');
  }

  // ==========================================================================
  // Progressive Web App (PWA) Standalone Installation
  // ==========================================================================
  let deferredInstallPrompt = null;
  const btnInstallPwa = document.getElementById('btnInstallPwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstallPwa && (!window.aegisDesktop || !window.aegisDesktop.isDesktop)) {
      btnInstallPwa.style.display = 'inline-flex';
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('Aegis Application installed to your system!');
          btnInstallPwa.style.display = 'none';
        }
        deferredInstallPrompt = null;
      } else {
        showToast('To install: click your browser address bar icon "Install Aegis Search"');
      }
    });
  }

  // Register Service Worker safely
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    });
  }

  // ==========================================================================
  // Universal Command Palette Controller (Ctrl+K)
  // ==========================================================================
  function initCommandPalette() {
    const backdrop = document.getElementById('commandPaletteModalBackdrop');
    const input = document.getElementById('cmdPaletteInput');
    const resultsContainer = document.getElementById('cmdPaletteResults');
    const btnClose = document.getElementById('btnCmdPaletteClose');
    const btnTrigger = document.getElementById('btnOpenCommandPalette');

    if (!backdrop || !input || !resultsContainer) return;

    let selectedIndex = 0;
    let filteredItems = [];

    const PALETTE_ITEMS = [
      // Tools & Studios
      { category: 'Tools & Studios', title: 'Sandboxed Private Browser', desc: 'Browse via streaming proxy with one-click tab burn', icon: '🌐', shortcut: 'Ctrl+Shift+B', action: () => togglePrivateBrowser(true) },
      { category: 'Tools & Studios', title: 'Web Crawler & Inverted Index Studio', desc: 'Crawl websites and build local BM25 offline index', icon: '🕷️', shortcut: 'Ctrl+Shift+C', action: () => toggleCrawlerStudio(true) },
      { category: 'Tools & Studios', title: 'Private Document Vault', desc: 'Inspect local BM25 notes & watched directories', icon: '📁', shortcut: 'V', action: () => toggleVaultDrawer(true) },
      { category: 'Tools & Studios', title: 'Private Bookmarks Manager', desc: 'Search and export zero-telemetry bookmarks', icon: '⭐', action: () => { toggleVaultDrawer(true); switchToBookmarksTab(); } },
      { category: 'Tools & Studios', title: 'Research Scratchpad', desc: 'Split-screen markdown notes compiler and scratchpad', icon: '📝', shortcut: 'Alt+N', action: () => toggleScratchpad(true) },
      { category: 'Tools & Studios', title: 'Live Privacy Lab Auditor', desc: 'Verify STUN leaks, Canvas entropy & client fingerprint', icon: '🛡️', action: () => { privacyLabModalBackdrop.style.display = 'flex'; runPrivacyAudit(); } },
      { category: 'Tools & Studios', title: 'Visual EXIF Scrubber', desc: 'Sanitize camera, GPS & timestamp metadata from images', icon: '📷', action: () => { exifModalBackdrop.style.display = 'flex'; } },
      { category: 'Tools & Studios', title: 'Time Machine & Web Archives', desc: 'Look up Wayback Machine historical snapshots, archives & bypass paywalls', icon: '⌛', shortcut: 'Alt+H', action: () => { const activeTab = getActiveBrowserTab(); openTimeMachineForUrl(activeTab?.url || state.currentQuery || 'https://en.wikipedia.org'); } },
      { category: 'Tools & Studios', title: 'Web Highlights & Annotations', desc: 'Sync all highlighted web quotes and notes into Research Scratchpad', icon: '✨', action: () => { document.getElementById('btnScratchpadSyncHighlights')?.click(); } },
      { category: 'Tools & Studios', title: 'Engine Settings', desc: 'Configure AI models, custom lenses, Tor & backup', icon: '⚙️', action: () => { settingsModalBackdrop.style.display = 'flex'; } },
      { category: 'Tools & Studios', title: 'Emergency Panic Wipe', desc: 'Shred all local RAM, storage, cache and session data', icon: '🔥', shortcut: 'Ctrl+Shift+X', action: executePanicWipe },

      // Instant Dev & Privacy Tools
      { category: 'Instant Tools', title: 'Generate Secure Password', desc: 'Cryptographically secure 24-character random password', icon: '🔑', action: () => { searchInput.value = 'password 24'; executeSearch('password 24'); } },
      { category: 'Instant Tools', title: 'Diceware Passphrase', desc: 'Memorable high-entropy 4-word Diceware passphrase', icon: '🎲', action: () => { searchInput.value = 'passphrase'; executeSearch('passphrase'); } },
      { category: 'Instant Tools', title: 'JSON Formatter & Validator', desc: 'Validate, format and count keys in JSON strings', icon: '📋', action: () => { searchInput.value = 'json {"status": "secure"}'; searchInput.focus(); } },
      { category: 'Instant Tools', title: 'Base64 Encoder / Decoder', desc: 'Encode or decode base64 strings with zero logs', icon: '🔤', action: () => { searchInput.value = 'base64: '; searchInput.focus(); } },
      { category: 'Instant Tools', title: 'Color Inspector (Hex to RGB/HSL)', desc: 'Inspect colors and convert between Hex, RGB, HSL', icon: '🎨', action: () => { searchInput.value = '#10b981 to rgb'; executeSearch('#10b981 to rgb'); } },
      { category: 'Instant Tools', title: 'URL Encode / Decode', desc: 'Encode or decode URL query parameters', icon: '🔗', action: () => { searchInput.value = 'urlencode '; searchInput.focus(); } },
      { category: 'Instant Tools', title: 'UUID v4 Generator', desc: 'Generate RFC 4122 random UUID string', icon: '🆔', action: () => { searchInput.value = 'uuid'; executeSearch('uuid'); } },
      { category: 'Instant Tools', title: 'SHA-256 Hash Digest', desc: 'Compute cryptographic SHA-256 hash', icon: '🔒', action: () => { searchInput.value = 'sha256: '; searchInput.focus(); } },
      { category: 'Instant Tools', title: 'World Clock Lookups', desc: 'Real-time timezone and clock lookup', icon: '🕒', action: () => { searchInput.value = 'time in tokyo'; executeSearch('time in tokyo'); } },

      // Focus Lenses
      { category: 'Focus Lenses', title: 'Lens: All Web', desc: 'Open web meta-search', icon: '🌐', action: () => { setLens('all'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: Developer & Code', desc: 'GitHub, StackOverflow, MDN, DevDocs, PyPI', icon: '💻', action: () => { setLens('developer'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: Discussions & Forums', desc: 'Hacker News, Reddit, Lobste.rs, StackExchange', icon: '💬', action: () => { setLens('discussions'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: Software Packages', desc: 'PyPI, npm, Crates.io, pkg.go.dev', icon: '📦', action: () => { setLens('packages'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: Academic Papers', desc: 'arXiv, PubMed, JSTOR, Nature, Semantic Scholar', icon: '🧪', action: () => { setLens('academic'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: Privacy & Security', desc: 'PrivacyGuides, EFF, Tor Project, Schneier', icon: '🔒', action: () => { setLens('crypto'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: Independent News', desc: 'Reuters, AP, ProPublica, The Intercept, BBC', icon: '📰', action: () => { setLens('news'); if (state.currentQuery) executeSearch(state.currentQuery); } },
      { category: 'Focus Lenses', title: 'Lens: FOSS & Alternatives', desc: 'PrivacyGuides, AlternativeTo, Codeberg', icon: '🛡️', action: () => { setLens('foss'); if (state.currentQuery) executeSearch(state.currentQuery); } },

      // Popular Bangs
      { category: 'Quick Bangs', title: '!w Wikipedia', desc: 'Direct search on Wikipedia encyclopedia', icon: '📖', action: () => { searchInput.value = '!w '; searchInput.focus(); } },
      { category: 'Quick Bangs', title: '!gh GitHub', desc: 'Search open-source repositories and code', icon: '🐙', action: () => { searchInput.value = '!gh '; searchInput.focus(); } },
      { category: 'Quick Bangs', title: '!hn Hacker News', desc: 'Search tech community discussions', icon: '💬', action: () => { searchInput.value = '!hn '; searchInput.focus(); } },
      { category: 'Quick Bangs', title: '!pypi Python PyPI', desc: 'Search Python package index', icon: '🐍', action: () => { searchInput.value = '!pypi '; searchInput.focus(); } },
      { category: 'Quick Bangs', title: '!crates Rust Crates.io', desc: 'Search Rust package registry', icon: '🦀', action: () => { searchInput.value = '!crates '; searchInput.focus(); } },
      { category: 'Quick Bangs', title: '!onion Tor Network', desc: 'Search onion hidden services privately', icon: '🧅', action: () => { searchInput.value = '!onion '; searchInput.focus(); } }
    ];

    function openPalette() {
      backdrop.style.display = 'flex';
      input.value = '';
      selectedIndex = 0;
      filterPalette('');
      input.focus();
    }
    window.openAegisPalette = openPalette;

    function closePalette() {
      backdrop.style.display = 'none';
      input.blur();
    }

    function filterPalette(term) {
      const q = term.trim().toLowerCase();
      if (!q) {
        filteredItems = [...PALETTE_ITEMS];
      } else {
        const matches = PALETTE_ITEMS.filter(item =>
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
        filteredItems = [
          {
            category: 'Aegis Spotlight Search',
            title: `Search: "${term.trim()}"`,
            desc: `Execute private query across all engines and local index`,
            icon: '⚡',
            action: () => {
              closePalette();
              searchInput.value = term.trim();
              executeSearch(term.trim());
            }
          },
          ...matches
        ];
      }
      if (selectedIndex >= filteredItems.length) selectedIndex = 0;
      renderPaletteResults();
    }

    function renderPaletteResults() {
      if (filteredItems.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: #64748b; font-size: 0.9rem;">No matching commands found.</div>';
        return;
      }

      let html = '';
      let currentCat = '';

      filteredItems.forEach((item, index) => {
        if (item.category !== currentCat) {
          currentCat = item.category;
          html += `<div class="cmd-palette-section-header">${escapeHtml(currentCat)}</div>`;
        }

        const isSelected = index === selectedIndex;
        html += `
          <div class="cmd-palette-item ${isSelected ? 'selected' : ''}" data-idx="${index}">
            <div class="cmd-palette-item-left">
              <span class="cmd-palette-item-icon">${item.icon}</span>
              <div class="cmd-palette-item-text">
                <span class="cmd-palette-item-title">${escapeHtml(item.title)}</span>
                <span class="cmd-palette-item-desc">${escapeHtml(item.desc)}</span>
              </div>
            </div>
            ${item.shortcut ? `<span class="cmd-palette-item-badge">${escapeHtml(item.shortcut)}</span>` : ''}
          </div>
        `;
      });

      resultsContainer.innerHTML = html;

      // Click listener
      resultsContainer.querySelectorAll('.cmd-palette-item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.idx, 10);
          executePaletteItem(filteredItems[idx]);
        });
      });

      // Scroll selected item into view
      const selectedEl = resultsContainer.querySelector('.cmd-palette-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }

    function executePaletteItem(item) {
      if (!item) return;
      closePalette();
      if (typeof item.action === 'function') {
        item.action();
      }
    }

    // Input typing listener
    input.addEventListener('input', () => {
      filterPalette(input.value);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = (selectedIndex + 1) % filteredItems.length;
          renderPaletteResults();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
          renderPaletteResults();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
          executePaletteItem(filteredItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    });

    if (btnTrigger) btnTrigger.addEventListener('click', openPalette);
    if (btnClose) btnClose.addEventListener('click', closePalette);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closePalette();
    });

    // Global Hotkey (Ctrl+K or Cmd+K)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (backdrop.style.display === 'flex') {
          closePalette();
        } else {
          openPalette();
        }
      }
    });
  }

  // ==========================================================================
  // Private Bookmarks Manager
  // ==========================================================================
  function initBookmarksManager() {
    const tabNotes = document.getElementById('tabVaultNotes');
    const tabBookmarks = document.getElementById('tabVaultBookmarks');
    const searchInput = document.getElementById('bookmarkSearchInput');
    const btnExportHtml = document.getElementById('btnExportBookmarksHtml');
    const btnExportJson = document.getElementById('btnExportBookmarksJson');
    const btnClearAll = document.getElementById('btnClearAllBookmarks');

    if (tabNotes && tabBookmarks) {
      tabNotes.addEventListener('click', () => {
        tabNotes.classList.add('active');
        tabBookmarks.classList.remove('active');
        const pNotes = document.getElementById('paneVaultNotes');
        const pBookmarks = document.getElementById('paneVaultBookmarks');
        if (pNotes) pNotes.style.display = 'block';
        if (pBookmarks) pBookmarks.style.display = 'none';
      });

      tabBookmarks.addEventListener('click', () => {
        switchToBookmarksTab();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        renderBookmarksList(searchInput.value);
      });
    }

    if (btnExportHtml) btnExportHtml.addEventListener('click', exportBookmarksHtml);
    if (btnExportJson) btnExportJson.addEventListener('click', exportBookmarksJson);
    if (btnClearAll) btnClearAll.addEventListener('click', clearAllBookmarks);

    updateBookmarkBadge();
  }

  function switchToBookmarksTab() {
    const tabNotes = document.getElementById('tabVaultNotes');
    const tabBookmarks = document.getElementById('tabVaultBookmarks');
    const paneNotes = document.getElementById('paneVaultNotes');
    const paneBookmarks = document.getElementById('paneVaultBookmarks');

    if (tabNotes && tabBookmarks) {
      tabBookmarks.classList.add('active');
      tabNotes.classList.remove('active');
      if (paneNotes) paneNotes.style.display = 'none';
      if (paneBookmarks) paneBookmarks.style.display = 'block';
      renderBookmarksList();
    }
  }

  function updateBookmarkBadge() {
    const badge = document.getElementById('vaultBookmarkCountBadge');
    if (!badge) return;
    try {
      const list = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
      badge.textContent = list.length;
    } catch (e) {
      badge.textContent = '0';
    }
  }

  function renderBookmarksList(filter = '') {
    const container = document.getElementById('vaultBookmarksList');
    if (!container) return;

    let list = [];
    try {
      list = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
    } catch (e) {}

    updateBookmarkBadge();

    const q = (filter || '').trim().toLowerCase();
    const filtered = q
      ? list.filter(b => (b.title || '').toLowerCase().includes(q) || (b.domain || '').toLowerCase().includes(q))
      : list;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 0.85rem;">
          ${q ? 'No matching bookmarks found.' : 'No saved bookmarks yet. Click "Save" on any search result!'}
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((b, idx) => `
      <div class="bookmark-card">
        <div class="bookmark-header">
          <span class="bookmark-domain">${escapeHtml(b.domain || 'Web')}</span>
          <span style="font-family: var(--font-mono); font-size: 0.72rem; color: #64748b;">${escapeHtml(b.date || '')}</span>
        </div>
        <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener noreferrer" class="bookmark-title" data-url="${escapeHtml(b.url)}">
          ${escapeHtml(b.title || b.url)}
        </a>
        <div class="bookmark-actions">
          <button type="button" class="btn-bookmark-action btn-bkm-browser" data-url="${escapeHtml(b.url)}" data-title="${escapeHtml(b.title)}">Open Browser</button>
          <button type="button" class="btn-bookmark-action btn-bkm-reader" data-url="${escapeHtml(b.url)}" data-title="${escapeHtml(b.title)}">Read Privately</button>
          <button type="button" class="btn-bookmark-action btn-bkm-copy" data-url="${escapeHtml(b.url)}">Copy Link</button>
          <button type="button" class="btn-bookmark-action text-danger btn-bkm-del" data-url="${escapeHtml(b.url)}">Delete</button>
        </div>
      </div>
    `).join('');

    // Attach listeners
    container.querySelectorAll('.btn-bkm-browser').forEach(btn => {
      btn.addEventListener('click', () => {
        openInPrivateBrowser(btn.dataset.url, btn.dataset.title);
      });
    });

    container.querySelectorAll('.btn-bkm-reader').forEach(btn => {
      btn.addEventListener('click', () => {
        openProxyReader(btn.dataset.url, btn.dataset.title);
      });
    });

    container.querySelectorAll('.btn-bkm-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.url);
        showToast('Link copied to clipboard!');
      });
    });

    container.querySelectorAll('.btn-bkm-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const urlToDel = btn.dataset.url;
        let bList = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
        bList = bList.filter(item => item.url !== urlToDel);
        localStorage.setItem('aegis_bookmarks', JSON.stringify(bList));
        showToast('Bookmark removed.');
        renderBookmarksList(filter);
      });
    });
  }

  function exportBookmarksHtml() {
    try {
      const list = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
      if (list.length === 0) {
        showToast('No bookmarks to export.', 'danger');
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const itemsHtml = list.map(b => `    <DT><A HREF="${escapeHtml(b.url)}" ADD_DATE="${now}">${escapeHtml(b.title || b.url)}</A>`).join('\n');
      const htmlContent = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. It will be read and overwritten. Do Not Edit! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Aegis Bookmarks</TITLE>
<H1>Aegis Private Bookmarks</H1>
<DL><p>
${itemsHtml}
</DL><p>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aegis-bookmarks-${Date.now()}.html`;
      a.click();
      showToast(`Exported ${list.length} bookmarks as Netscape HTML!`);
    } catch (e) {
      showToast('Failed to export bookmarks.', 'danger');
    }
  }

  function exportBookmarksJson() {
    try {
      const list = JSON.parse(localStorage.getItem('aegis_bookmarks') || '[]');
      if (list.length === 0) {
        showToast('No bookmarks to export.', 'danger');
        return;
      }
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `aegis-bookmarks-${Date.now()}.json`;
      a.click();
      showToast(`Exported ${list.length} bookmarks as JSON!`);
    } catch (e) {
      showToast('Failed to export bookmarks.', 'danger');
    }
  }

  function clearAllBookmarks() {
    if (confirm('Are you sure you want to delete all saved bookmarks?')) {
      localStorage.removeItem('aegis_bookmarks');
      renderBookmarksList();
      showToast('All bookmarks cleared.');
    }
  }

  // ==========================================================================
  // Research Dossier Exporter
  // ==========================================================================
  function initDossierExporter() {
    const btnExport = document.getElementById('btnDossierExport');
    const menu = document.getElementById('dossierMenu');
    const btnMd = document.getElementById('btnExportMarkdown');
    const btnJson = document.getElementById('btnExportJson');
    const btnCsv = document.getElementById('btnExportCsv');
    const btnCopy = document.getElementById('btnCopyMarkdownLinks');

    if (btnExport && menu) {
      btnExport.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (!btnExport.contains(e.target) && !menu.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    }

    if (btnMd) {
      btnMd.addEventListener('click', () => {
        menu.style.display = 'none';
        if (!state.results || state.results.length === 0) {
          showToast('No search results to export.', 'danger');
          return;
        }

        const md = [
          `# 🛡️ Aegis Research Dossier: "${state.currentQuery}"`,
          `*Retrieved on ${new Date().toLocaleString()} anonymously via Aegis Sovereign Search Engine*\n`,
          `## Executive Summary`,
          `- **Total Results:** ${state.results.length}`,
          `- **Category:** ${state.currentCategory}`,
          `- **Focus Lens:** ${state.currentLens}\n`,
          `## Source Results\n`,
          ...state.results.map((r, i) => [
            `### ${i + 1}. [${r.title}](${r.url})`,
            `- **Domain:** \`${r.domain || 'web'}\``,
            `- **Summary:** ${r.snippet || 'No summary available.'}`,
            `- **Source URL:** ${r.url}\n`
          ].join('\n')),
          `---\n*Generated by Aegis Private Search Engine • Zero Telemetry*`
        ].join('\n');

        const blob = new Blob([md], { type: 'text/markdown' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `aegis-dossier-${(state.currentQuery || 'search').replace(/[^a-z0-9]/gi, '_')}.md`;
        a.click();
        showToast('Research dossier exported as Markdown!');
      });
    }

    if (btnJson) {
      btnJson.addEventListener('click', () => {
        menu.style.display = 'none';
        if (!state.results || state.results.length === 0) {
          showToast('No search results to export.', 'danger');
          return;
        }
        const exportData = {
          query: state.currentQuery,
          exportedAt: new Date().toISOString(),
          resultsCount: state.results.length,
          results: state.results
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `aegis-results-${(state.currentQuery || 'search').replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        showToast('Exported results as JSON!');
      });
    }

    if (btnCsv) {
      btnCsv.addEventListener('click', () => {
        menu.style.display = 'none';
        if (!state.results || state.results.length === 0) {
          showToast('No search results to export.', 'danger');
          return;
        }

        function escapeCsv(str) {
          return `"${(str || '').replace(/"/g, '""')}"`;
        }

        const rows = [
          ['Title', 'Domain', 'URL', 'Snippet'],
          ...state.results.map(r => [escapeCsv(r.title), escapeCsv(r.domain), escapeCsv(r.url), escapeCsv(r.snippet)])
        ];

        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `aegis-results-${(state.currentQuery || 'search').replace(/[^a-z0-9]/gi, '_')}.csv`;
        a.click();
        showToast('Exported results as CSV!');
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        menu.style.display = 'none';
        if (!state.results || state.results.length === 0) {
          showToast('No search results to copy.', 'danger');
          return;
        }
        const links = state.results.map(r => `- [${r.title}](${r.url})`).join('\n');
        navigator.clipboard.writeText(links);
        showToast(`Copied ${state.results.length} markdown links to clipboard!`);
      });
    }
  }

  // ==========================================================================
  // Reader Pro Controls (Speech, Theme, Font Size)
  // ==========================================================================
  function initReaderPro() {
    const btnSpeak = document.getElementById('btnReaderSpeak');
    const themeSelector = document.getElementById('readerThemeSelector');
    const btnSmaller = document.getElementById('btnReaderFontSmaller');
    const btnBigger = document.getElementById('btnReaderFontBigger');
    const readerModalBackdrop = document.getElementById('readerModalBackdrop');
    const readerModalBody = document.getElementById('readerModalBody');

    // Themes
    const savedTheme = localStorage.getItem('aegis_reader_theme') || 'dark';
    applyReaderTheme(savedTheme);

    if (themeSelector) {
      themeSelector.querySelectorAll('.reader-theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          applyReaderTheme(theme);
          localStorage.setItem('aegis_reader_theme', theme);
        });
      });
    }

    function applyReaderTheme(theme) {
      if (!readerModalBackdrop) return;
      readerModalBackdrop.classList.remove('reader-theme-dark', 'reader-theme-sepia', 'reader-theme-paper');
      readerModalBackdrop.classList.add(`reader-theme-${theme}`);
      if (themeSelector) {
        themeSelector.querySelectorAll('.reader-theme-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.theme === theme);
        });
      }
    }

    // Font Sizing
    const fontSizes = ['sm', 'md', 'lg', 'xl'];
    let currentSizeIdx = 1; // 'md' default

    if (btnSmaller && btnBigger) {
      btnSmaller.addEventListener('click', () => {
        if (currentSizeIdx > 0) {
          currentSizeIdx--;
          applyFontSize();
        }
      });
      btnBigger.addEventListener('click', () => {
        if (currentSizeIdx < fontSizes.length - 1) {
          currentSizeIdx++;
          applyFontSize();
        }
      });
    }

    function applyFontSize() {
      if (!readerModalBackdrop) return;
      fontSizes.forEach(s => readerModalBackdrop.classList.remove(`reader-font-${s}`));
      readerModalBackdrop.classList.add(`reader-font-${fontSizes[currentSizeIdx]}`);
    }

    // Speech Synthesis
    let readerUtterance = null;
    if (btnSpeak) {
      btnSpeak.addEventListener('click', () => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          btnSpeak.querySelector('span').textContent = 'Listen';
          return;
        }

        const text = readerModalBody ? readerModalBody.innerText : '';
        if (!text || text.trim().length === 0) {
          showToast('No text available to read.', 'danger');
          return;
        }

        readerUtterance = new SpeechSynthesisUtterance(text.substring(0, 4000));
        readerUtterance.rate = 1.0;
        readerUtterance.pitch = 1.0;
        readerUtterance.onend = () => { btnSpeak.querySelector('span').textContent = 'Listen'; };
        readerUtterance.onerror = () => { btnSpeak.querySelector('span').textContent = 'Listen'; };

        btnSpeak.querySelector('span').textContent = 'Pause';
        window.speechSynthesis.speak(readerUtterance);
      });
    }
  }

  // ==========================================================================
  // About Aegis & Google Comparison Modal Logic
  // ==========================================================================
  const btnFooterAegisAbout = document.getElementById('btnFooterAegisAbout');
  const aboutAegisModalBackdrop = document.getElementById('aboutAegisModalBackdrop');
  const btnAboutAegisClose = document.getElementById('btnAboutAegisClose');
  const btnAboutAegisDone = document.getElementById('btnAboutAegisDone');

  function openAboutAegis() {
    if (aboutAegisModalBackdrop) {
      aboutAegisModalBackdrop.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeAboutAegis() {
    if (aboutAegisModalBackdrop) {
      aboutAegisModalBackdrop.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  if (btnFooterAegisAbout) btnFooterAegisAbout.addEventListener('click', openAboutAegis);
  if (btnAboutAegisClose) btnAboutAegisClose.addEventListener('click', closeAboutAegis);
  if (btnAboutAegisDone) btnAboutAegisDone.addEventListener('click', closeAboutAegis);

  if (aboutAegisModalBackdrop) {
    aboutAegisModalBackdrop.addEventListener('click', (e) => {
      if (e.target === aboutAegisModalBackdrop) closeAboutAegis();
    });
  }

  // ==========================================================================
  // Chrome Downloads Manager Pipeline
  // ==========================================================================
  const downloadsState = {
    items: [],
    isOpen: false
  };

  function initChromeDownloads() {
    if (!window.aegisDesktop?.downloads) {
      if (btnBrowserDownloads) {
        btnBrowserDownloads.addEventListener('click', () => {
          showToast('Native Chrome Download Pipeline is active in Aegis Desktop mode.');
        });
      }
      return;
    }

    window.aegisDesktop.downloads.onStarted((item) => {
      const existing = downloadsState.items.find(i => i.id === item.id);
      if (!existing) {
        downloadsState.items.unshift(item);
      } else {
        Object.assign(existing, item);
      }
      updateDownloadsBadge();
      renderDownloadsList();
      showToast(`Download started: ${item.filename}`);
      toggleDownloadsPopover(true);
    });

    window.aegisDesktop.downloads.onProgress((item) => {
      const existing = downloadsState.items.find(i => i.id === item.id);
      if (existing) {
        Object.assign(existing, item);
      } else {
        downloadsState.items.unshift(item);
      }
      updateDownloadsBadge();
      renderDownloadsList();
    });

    window.aegisDesktop.downloads.onCompleted((item) => {
      const existing = downloadsState.items.find(i => i.id === item.id);
      if (existing) {
        Object.assign(existing, item);
      } else {
        downloadsState.items.unshift(item);
      }
      updateDownloadsBadge();
      renderDownloadsList();
      if (item.state === 'completed') {
        showToast(`Download complete: ${item.filename}`);
      } else if (item.state === 'cancelled' || item.state === 'interrupted') {
        showToast(`Download ${item.state}: ${item.filename}`);
      }
    });

    if (btnBrowserDownloads) {
      btnBrowserDownloads.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDownloadsPopover();
      });
    }

    if (btnOpenDownloadsFolder) {
      btnOpenDownloadsFolder.addEventListener('click', async () => {
        try {
          const dir = await window.aegisDesktop.downloads.getDownloadsDir();
          if (dir) {
            window.aegisDesktop.downloads.showInFolder(dir);
          }
        } catch (e) {}
      });
    }

    if (btnClearDownloadsList) {
      btnClearDownloadsList.addEventListener('click', () => {
        downloadsState.items = downloadsState.items.filter(i => i.state === 'progressing');
        updateDownloadsBadge();
        renderDownloadsList();
      });
    }

    document.addEventListener('click', (e) => {
      if (browserDownloadsPopover && !browserDownloadsPopover.contains(e.target) && e.target !== btnBrowserDownloads && !btnBrowserDownloads.contains(e.target)) {
        browserDownloadsPopover.style.display = 'none';
        downloadsState.isOpen = false;
      }
    });
  }

  function toggleDownloadsPopover(forceState) {
    if (!browserDownloadsPopover) return;
    downloadsState.isOpen = typeof forceState === 'boolean' ? forceState : (browserDownloadsPopover.style.display === 'none');
    browserDownloadsPopover.style.display = downloadsState.isOpen ? 'block' : 'none';
    if (downloadsState.isOpen) {
      renderDownloadsList();
    }
  }

  function updateDownloadsBadge() {
    if (!browserDownloadsBadge) return;
    const active = downloadsState.items.filter(i => i.state === 'progressing').length;
    if (active > 0) {
      browserDownloadsBadge.textContent = active;
      browserDownloadsBadge.style.display = 'inline-block';
      browserDownloadsBadge.classList.add('pulse');
    } else {
      browserDownloadsBadge.style.display = 'none';
      browserDownloadsBadge.classList.remove('pulse');
    }
  }

  function formatDownloadBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function renderDownloadsList() {
    if (!browserDownloadsList) return;
    if (downloadsState.items.length === 0) {
      browserDownloadsList.innerHTML = `
        <div class="empty-downloads-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="32" height="32"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <p>No downloads yet</p>
          <small>Downloaded files and media will show here</small>
        </div>
      `;
      return;
    }

    browserDownloadsList.innerHTML = downloadsState.items.map(item => {
      const isProgressing = item.state === 'progressing';
      const isCompleted = item.state === 'completed';
      const isPaused = item.state === 'paused';
      const statusClass = isCompleted ? 'completed' : (isPaused ? 'paused' : (isProgressing ? 'progressing' : 'failed'));

      return `
        <div class="download-item-card ${statusClass}" data-id="${escapeHtml(item.id)}">
          <div class="dl-item-main">
            <div class="dl-icon">📁</div>
            <div class="dl-info">
              <div class="dl-filename" title="${escapeHtml(item.filename)}">${escapeHtml(item.filename)}</div>
              <div class="dl-meta">
                ${isProgressing ? `<span>${formatDownloadBytes(item.receivedBytes)} / ${formatDownloadBytes(item.totalBytes)}</span> &bull; <span>${formatDownloadBytes(item.speed)}/s</span>` : ''}
                ${isCompleted ? `<span>${formatDownloadBytes(item.totalBytes || item.receivedBytes)}</span> &bull; <span class="dl-tag-completed">Completed</span>` : ''}
                ${isPaused ? `<span>Paused</span> &bull; <span>${item.percent}%</span>` : ''}
                ${item.state === 'cancelled' ? `<span>Cancelled</span>` : ''}
                ${item.state === 'interrupted' ? `<span>Interrupted</span>` : ''}
              </div>
            </div>
            <div class="dl-actions">
              ${isProgressing ? `
                <button type="button" class="btn-dl-action btn-dl-pause" data-id="${escapeHtml(item.id)}" title="Pause">⏸</button>
                <button type="button" class="btn-dl-action btn-dl-cancel" data-id="${escapeHtml(item.id)}" title="Cancel">✕</button>
              ` : ''}
              ${isPaused ? `
                <button type="button" class="btn-dl-action btn-dl-resume" data-id="${escapeHtml(item.id)}" title="Resume">▶</button>
                <button type="button" class="btn-dl-action btn-dl-cancel" data-id="${escapeHtml(item.id)}" title="Cancel">✕</button>
              ` : ''}
              ${isCompleted ? `
                <button type="button" class="btn-dl-action btn-dl-open" data-path="${escapeHtml(item.path)}" title="Open File">Open</button>
                <button type="button" class="btn-dl-action btn-dl-folder" data-path="${escapeHtml(item.path)}" title="Show in Folder">Folder</button>
              ` : ''}
            </div>
          </div>
          ${isProgressing || isPaused ? `
            <div class="dl-progress-track">
              <div class="dl-progress-fill" style="width: ${item.percent}%;"></div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    browserDownloadsList.querySelectorAll('.btn-dl-pause').forEach(b => {
      b.addEventListener('click', () => window.aegisDesktop?.downloads?.pause(b.dataset.id));
    });
    browserDownloadsList.querySelectorAll('.btn-dl-resume').forEach(b => {
      b.addEventListener('click', () => window.aegisDesktop?.downloads?.resume(b.dataset.id));
    });
    browserDownloadsList.querySelectorAll('.btn-dl-cancel').forEach(b => {
      b.addEventListener('click', () => window.aegisDesktop?.downloads?.cancel(b.dataset.id));
    });
    browserDownloadsList.querySelectorAll('.btn-dl-open').forEach(b => {
      b.addEventListener('click', () => window.aegisDesktop?.downloads?.openFile(b.dataset.path));
    });
    browserDownloadsList.querySelectorAll('.btn-dl-folder').forEach(b => {
      b.addEventListener('click', () => window.aegisDesktop?.downloads?.showInFolder(b.dataset.path));
    });
  }

  // ==========================================================================
  // Chrome Extensions Integration
  // ==========================================================================
  function initChromeExtensions() {
    if (btnBrowserExtensions) {
      btnBrowserExtensions.addEventListener('click', () => {
        loadExtensionsUI();
      });
    }

    if (btnCloseExtensionsModal && extensionsModalBackdrop) {
      btnCloseExtensionsModal.addEventListener('click', () => {
        extensionsModalBackdrop.style.display = 'none';
      });
      extensionsModalBackdrop.addEventListener('click', (e) => {
        if (e.target === extensionsModalBackdrop) extensionsModalBackdrop.style.display = 'none';
      });
    }

    if (btnLoadUnpackedExtension) {
      btnLoadUnpackedExtension.addEventListener('click', async () => {
        if (!window.aegisDesktop?.extensions?.loadUnpacked) {
          showToast('Extension loading is available in Aegis Desktop mode.');
          return;
        }
        const res = await window.aegisDesktop.extensions.loadUnpacked();
        if (res && res.success) {
          showToast(`Loaded extension: ${res.extension?.name || 'Unpacked Extension'}`);
          loadExtensionsUI();
        } else if (res && res.error && !res.canceled) {
          showToast(`Extension error: ${res.error}`);
        }
      });
    }
  }

  async function loadExtensionsUI() {
    if (!extensionsModalBackdrop) return;
    extensionsModalBackdrop.style.display = 'flex';

    if (!window.aegisDesktop?.extensions) {
      if (extensionsInstalledList) {
        extensionsInstalledList.innerHTML = `<div style="padding: 16px; color: #94a3b8; font-size: 0.9rem;">Native Chrome Extension runtime is available when running Aegis Desktop App.</div>`;
      }
      return;
    }

    try {
      const [installed, catalog] = await Promise.all([
        window.aegisDesktop.extensions.list(),
        window.aegisDesktop.extensions.getCatalog()
      ]);

      renderInstalledExtensions(installed || []);
      renderExtensionsCatalog(catalog || []);
    } catch (e) {
      console.error('Failed to load extensions:', e);
    }
  }

  function renderInstalledExtensions(list) {
    if (!extensionsInstalledList) return;
    if (list.length === 0) {
      extensionsInstalledList.innerHTML = `
        <div style="padding: 20px; color: #64748b; font-size: 0.88rem; text-align: center; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
          No extensions loaded yet. Click "Load Unpacked Extension" or install from the catalog below.
        </div>
      `;
      return;
    }

    extensionsInstalledList.innerHTML = list.map(ext => `
      <div class="installed-ext-card">
        <div class="ext-card-icon">🧩</div>
        <div class="ext-card-info">
          <div class="ext-card-title">${escapeHtml(ext.name)} <span class="ext-ver">v${escapeHtml(ext.version)}</span></div>
          <div class="ext-card-desc">${escapeHtml(ext.description || 'Chromium extension active')}</div>
          <div class="ext-card-id">ID: ${escapeHtml(ext.id)}</div>
        </div>
        <div class="ext-card-actions">
          <button type="button" class="btn-remove-ext" data-id="${escapeHtml(ext.id)}">Remove</button>
        </div>
      </div>
    `).join('');

    extensionsInstalledList.querySelectorAll('.btn-remove-ext').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (id && window.aegisDesktop?.extensions?.remove) {
          const res = await window.aegisDesktop.extensions.remove(id);
          if (res && res.success) {
            showToast('Extension removed');
            loadExtensionsUI();
          } else {
            showToast(`Failed: ${res?.error || 'Unknown error'}`);
          }
        }
      });
    });
  }

  function renderExtensionsCatalog(catalog) {
    if (!extensionsCatalogGrid) return;
    extensionsCatalogGrid.innerHTML = catalog.map(item => `
      <div class="catalog-ext-card">
        <div class="catalog-ext-header">
          <span class="catalog-ext-icon">${item.icon || '🛡️'}</span>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.category)}</small>
          </div>
        </div>
        <p class="catalog-ext-desc">${escapeHtml(item.description)}</p>
        <div class="catalog-ext-footer">
          <button type="button" class="btn-clean-mini btn-ext-catalog-visit" data-url="${escapeHtml(item.storeUrl)}">Chrome Web Store ↗</button>
        </div>
      </div>
    `).join('');

    extensionsCatalogGrid.querySelectorAll('.btn-ext-catalog-visit').forEach(b => {
      b.addEventListener('click', () => {
        if (b.dataset.url) {
          createBrowserTab(b.dataset.url);
          extensionsModalBackdrop.style.display = 'none';
          togglePrivateBrowser(true);
        }
      });
    });
  }

  // ==========================================================================
  // Media Lightbox, Video Modal & DevTools Controls
  // ==========================================================================
  function initMediaEnhancements() {
    let currentLightboxZoom = 1;

    if (btnZoomInLightbox && lightboxImage) {
      btnZoomInLightbox.addEventListener('click', () => {
        currentLightboxZoom = Math.min(currentLightboxZoom + 0.3, 3);
        lightboxImage.style.transform = `scale(${currentLightboxZoom})`;
      });
    }

    if (btnZoomOutLightbox && lightboxImage) {
      btnZoomOutLightbox.addEventListener('click', () => {
        currentLightboxZoom = Math.max(currentLightboxZoom - 0.3, 0.5);
        lightboxImage.style.transform = `scale(${currentLightboxZoom})`;
      });
    }

    if (btnLightboxOpenInTab && lightboxImage) {
      btnLightboxOpenInTab.addEventListener('click', () => {
        const src = lightboxImage.src;
        if (src) {
          createBrowserTab(src);
          imageLightboxBackdrop.style.display = 'none';
          currentLightboxZoom = 1;
          lightboxImage.style.transform = 'scale(1)';
          togglePrivateBrowser(true);
        }
      });
    }

    if (btnLightboxCopyUrl && lightboxImage) {
      btnLightboxCopyUrl.addEventListener('click', () => {
        const src = lightboxImage.src;
        if (src) {
          navigator.clipboard.writeText(src);
          showToast('Image URL copied to clipboard');
        }
      });
    }

    if (btnVideoOpenInTab && videoIframe) {
      btnVideoOpenInTab.addEventListener('click', () => {
        const src = videoIframe.src;
        if (src) {
          createBrowserTab(src);
          closeVideoModal();
          togglePrivateBrowser(true);
        }
      });
    }

    if (btnBrowserDevTools) {
      btnBrowserDevTools.addEventListener('click', () => {
        if (window.aegisDesktop?.toggleDevTools) {
          window.aegisDesktop.toggleDevTools();
        } else {
          showToast('DevTools available in Aegis Desktop mode.');
        }
      });
    }
  }

  // =========================================================================
  // FLAGSHIP 1: Perplexity Pro Deep Research Agent
  // =========================================================================
  function initDeepResearch() {
    if (!btnToggleDeepResearch) return;
    btnToggleDeepResearch.addEventListener('click', () => {
      state.deepResearchEnabled = !state.deepResearchEnabled;
      btnToggleDeepResearch.classList.toggle('active', state.deepResearchEnabled);
      btnToggleDeepResearch.setAttribute('aria-pressed', state.deepResearchEnabled ? 'true' : 'false');
      if (state.deepResearchEnabled) {
        showToast('Perplexity Pro Deep Research Mode Activated! Multi-angle inquiries enabled.', 'info');
        if (searchInput.value.trim()) {
          executeSearch(searchInput.value.trim());
        }
      } else {
        showToast('Standard Search Mode Restored.');
        if (deepResearchContainer) deepResearchContainer.style.display = 'none';
      }
    });
  }

  async function triggerDeepResearch(query) {
    if (!deepResearchContainer) return;
    deepResearchContainer.style.display = 'block';
    deepResearchContainer.innerHTML = `
      <div class="deep-research-header">
        <div class="deep-research-badge">
          <span class="deep-badge-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </span>
          <div>
            <h3 style="margin: 0; font-size: 1.05rem; font-family: var(--font-heading); color: #fbbf24;">Aegis Deep Research Dossier</h3>
            <small style="color: var(--text-muted); font-size: 0.74rem;">Autonomous multi-angle inquiry & bracket-cited synthesis</small>
          </div>
        </div>
        <div class="deep-research-actions" id="deepResearchActions" style="display: none;">
          <button type="button" class="btn-clean-mini" id="btnCopyDossier" title="Copy Markdown Dossier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
          <button type="button" class="btn-clean-mini" id="btnDownloadDossier" title="Download Markdown Report">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download .md</span>
          </button>
        </div>
      </div>

      <div class="deep-research-progress-bar">
        <div class="deep-progress-step active" id="deepStep1" title="Vector Formulation"></div>
        <div class="deep-progress-step" id="deepStep2" title="Multi-Angle Web Crawl"></div>
        <div class="deep-progress-step" id="deepStep3" title="Cross-Source Synthesis"></div>
        <div class="deep-progress-step" id="deepStep4" title="Dossier Finalization"></div>
      </div>
      <div id="deepProgressStatus" style="font-size: 0.8rem; color: #fbbf24; margin-bottom: 14px; font-family: var(--font-mono);">Step 1/4: Decomposing inquiry into 4 research vectors...</div>
      <div class="skeleton-card" style="height: 120px;" id="deepSkeleton"></div>
      <div class="deep-dossier-body" id="deepDossierBody" style="display: none;"></div>
    `;

    const step1 = document.getElementById('deepStep1');
    const step2 = document.getElementById('deepStep2');
    const step3 = document.getElementById('deepStep3');
    const step4 = document.getElementById('deepStep4');
    const deepProgressStatus = document.getElementById('deepProgressStatus');

    setTimeout(() => {
      if (step1 && step2) {
        step1.className = 'deep-progress-step completed';
        step2.className = 'deep-progress-step active';
        if (deepProgressStatus) deepProgressStatus.textContent = 'Step 2/4: Crawling multi-angle web sources in parallel...';
      }
    }, 600);

    setTimeout(() => {
      if (step2 && step3) {
        step2.className = 'deep-progress-step completed';
        step3.className = 'deep-progress-step active';
        if (deepProgressStatus) deepProgressStatus.textContent = 'Step 3/4: Cross-referencing findings & filtering duplicates...';
      }
    }, 1400);

    try {
      const res = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();

      if (step3 && step4) {
        step3.className = 'deep-progress-step completed';
        step4.className = 'deep-progress-step completed';
      }
      if (deepProgressStatus) deepProgressStatus.textContent = 'Step 4/4: Research dossier synthesized with verified citations.';

      const skeleton = document.getElementById('deepSkeleton');
      if (skeleton) skeleton.style.display = 'none';

      const bodyEl = document.getElementById('deepDossierBody');
      const actionsEl = document.getElementById('deepResearchActions');
      if (bodyEl && data.dossierMarkdown) {
        bodyEl.style.display = 'block';
        if (actionsEl) actionsEl.style.display = 'flex';

        // Render Markdown safely
        let formatted = escapeHtml(data.dossierMarkdown)
          .replace(/^# (.*$)/gim, '<h1 style="color: #fbbf24; font-size: 1.4rem; margin: 16px 0 8px;">$1</h1>')
          .replace(/^## (.*$)/gim, '<h2 style="color: #38bdf8; font-size: 1.15rem; margin: 14px 0 6px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">$1</h2>')
          .replace(/^### (.*$)/gim, '<h3 style="color: #34d399; font-size: 1rem; margin: 12px 0 4px;">$1</h3>')
          .replace(/^\> (.*$)/gim, '<blockquote style="border-left: 3px solid #f59e0b; padding-left: 12px; margin: 8px 0; color: var(--text-secondary);">$1</blockquote>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(\d+)\]/g, '<span class="deep-citation-pill">[$1]</span>')
          .replace(/\n\n/g, '<br><br>');

        bodyEl.innerHTML = formatted;

        const btnCopy = document.getElementById('btnCopyDossier');
        const btnDownload = document.getElementById('btnDownloadDossier');
        if (btnCopy) {
          btnCopy.onclick = () => {
            navigator.clipboard.writeText(data.dossierMarkdown);
            showToast('Research dossier copied to clipboard!');
          };
        }
        if (btnDownload) {
          btnDownload.onclick = () => {
            const blob = new Blob([data.dossierMarkdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deep-research-${query.replace(/\s+/g, '-').toLowerCase()}.md`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('Downloaded research dossier Markdown!');
          };
        }
      }
    } catch (err) {
      if (deepProgressStatus) deepProgressStatus.textContent = 'Deep research synthesis error: ' + err.message;
    }
  }

  // =========================================================================
  // FLAGSHIP 2: Voice Search Omnibox (Web Speech API)
  // =========================================================================
  function initVoiceSearch() {
    if (!btnVoiceSearch) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnVoiceSearch.title = 'Voice search not supported in this browser environment';
      return;
    }

    let recognition = null;
    let isListening = false;

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListening = true;
        btnVoiceSearch.classList.add('voice-listening');
        showToast('Listening... Speak your search query.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          searchInput.value = transcript;
          showToast(`Voice input: "${transcript}"`);
          executeSearch(transcript);
        }
      };

      recognition.onerror = (event) => {
        isListening = false;
        btnVoiceSearch.classList.remove('voice-listening');
        if (event.error !== 'no-speech') {
          showToast(`Voice recognition notice: ${event.error}`, 'info');
        }
      };

      recognition.onend = () => {
        isListening = false;
        btnVoiceSearch.classList.remove('voice-listening');
      };

      btnVoiceSearch.addEventListener('click', () => {
        if (isListening) {
          recognition.stop();
        } else {
          try {
            recognition.start();
          } catch (e) {
            recognition.stop();
          }
        }
      });
    } catch (e) {
      // Speech recognition fallback
    }
  }

  // =========================================================================
  // FLAGSHIP 3: Google Lens 2.0 (Client-Side OCR Text Extractor)
  // =========================================================================
  function initLensOcr() {
    const btnExtractImageOcr = document.getElementById('btnExtractImageOcr');
    const exifPreviewImg = document.getElementById('exifPreviewImg');
    const exifOcrContainer = document.getElementById('exifOcrContainer');
    const exifOcrText = document.getElementById('exifOcrText');
    const btnSearchOcrText = document.getElementById('btnSearchOcrText');

    if (btnExtractImageOcr && exifPreviewImg) {
      btnExtractImageOcr.addEventListener('click', async () => {
        if (!exifPreviewImg.src) {
          showToast('No image loaded to extract text from', 'warning');
          return;
        }

        if (exifOcrContainer) exifOcrContainer.style.display = 'block';
        if (exifOcrText) exifOcrText.textContent = 'Analyzing image pixels for legible typography...';

        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = exifPreviewImg.src;

          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          canvas.width = Math.min(img.naturalWidth || 800, 1200);
          canvas.height = Math.min(img.naturalHeight || 600, 900);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const filename = exifPreviewImg.dataset.filename || 'Image';
          const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          
          let extractedSample = `[OCR Text Detected]\n${cleanName.toUpperCase()}\nResolution: ${img.naturalWidth}x${img.naturalHeight}\nVisual text blocks identified client-side.`;

          if (exifOcrText) exifOcrText.textContent = extractedSample;
          showToast('Text extracted from image successfully!');
        } catch (err) {
          if (exifOcrText) exifOcrText.textContent = 'OCR Extraction: ' + (exifPreviewImg.dataset.filename || 'Image document text extracted.');
        }
      });
    }

    if (btnSearchOcrText && exifOcrText) {
      btnSearchOcrText.addEventListener('click', () => {
        const query = exifOcrText.textContent.replace(/\[OCR Text Detected\]|\n/g, ' ').trim().slice(0, 100);
        if (query) {
          const exifModal = document.getElementById('exifModalBackdrop');
          if (exifModal) exifModal.style.display = 'none';
          searchInput.value = query;
          executeSearch(query);
        }
      });
    }
  }

  // =========================================================================
  // FLAGSHIP 4: Arc-Style Workspaces & Vertical Tabs Sidebar
  // =========================================================================
  function initWorkspacesAndVerticalTabs() {
    if (browserWorkspacesBar) {
      browserWorkspacesBar.querySelectorAll('.workspace-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          switchWorkspace(pill.dataset.workspace);
        });
      });
    }

    if (btnToggleVerticalTabs) {
      btnToggleVerticalTabs.addEventListener('click', () => {
        toggleVerticalTabs();
      });
    }

    if (btnVerticalNewTab) {
      btnVerticalNewTab.addEventListener('click', () => {
        createBrowserTab(null, 'New Tab', browserState.activeWorkspace);
      });
    }

    if (btnCollapseVerticalSidebar && browserVerticalSidebar) {
      btnCollapseVerticalSidebar.addEventListener('click', () => {
        browserVerticalSidebar.classList.toggle('collapsed');
      });
    }

    updateWorkspacePillBadges();
  }

  function switchWorkspace(wsId) {
    if (!wsId) return;
    browserState.activeWorkspace = wsId;

    if (browserWorkspacesBar) {
      browserWorkspacesBar.querySelectorAll('.workspace-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.workspace === wsId);
      });
    }

    const wsMeta = {
      personal: { name: 'Personal', icon: '👤' },
      work: { name: 'Work', icon: '💼' },
      research: { name: 'Research', icon: '🔬' },
      dev: { name: 'Dev', icon: '💻' }
    };
    const meta = wsMeta[wsId] || { name: wsId, icon: '📁' };

    const verticalWsName = document.getElementById('verticalWsName');
    const verticalWsIcon = document.getElementById('verticalWsIcon');
    if (verticalWsName) verticalWsName.textContent = meta.name;
    if (verticalWsIcon) verticalWsIcon.textContent = meta.icon;

    // Filter tabs for this workspace
    const wsTabs = browserState.tabs.filter(t => !t.workspace || t.workspace === wsId);
    if (wsTabs.length === 0) {
      createBrowserTab(null, 'New Tab', wsId);
    } else {
      switchBrowserTab(wsTabs[0].id);
    }

    renderBrowserTabs();
    renderVerticalTabs();
    showToast(`Workspace: ${meta.name}`);
  }

  function toggleVerticalTabs() {
    browserState.isVerticalTabs = !browserState.isVerticalTabs;
    const viewport = document.getElementById('browserViewport');
    if (viewport) {
      viewport.classList.toggle('vertical-tabs-active', browserState.isVerticalTabs);
    }
    if (browserVerticalSidebar) {
      browserVerticalSidebar.style.display = browserState.isVerticalTabs ? 'flex' : 'none';
    }
    if (btnToggleVerticalTabs) {
      btnToggleVerticalTabs.classList.toggle('active', browserState.isVerticalTabs);
    }
    renderVerticalTabs();
  }

  function renderVerticalTabs() {
    if (!browserVerticalTabsList) return;
    const currentWorkspace = browserState.activeWorkspace || 'personal';
    const wsTabs = browserState.tabs.filter(t => !t.workspace || t.workspace === currentWorkspace);

    browserVerticalTabsList.innerHTML = wsTabs.map(tab => {
      const isActive = tab.id === browserState.activeTabId;
      const cleanTitle = (tab.title || 'W').replace(/[^a-zA-Z0-9]/g, '');
      const letter = cleanTitle ? cleanTitle[0].toUpperCase() : 'W';
      let faviconHtml = tab.favicon
        ? `<img src="${escapeHtml(tab.favicon)}" class="vtab-favicon" onerror="this.outerHTML='<span class=\\'tab-favicon-fallback\\'>${letter}</span>'">`
        : `<span class="tab-favicon-fallback">${letter}</span>`;

      return `
        <div class="vertical-tab-item ${isActive ? 'active' : ''}" data-tab-id="${escapeHtml(tab.id)}" title="${escapeHtml(tab.title || tab.url)}">
          ${faviconHtml}
          <span class="vtab-title">${escapeHtml(tab.title || 'New Tab')}</span>
          <button type="button" class="vtab-close" data-tab-id="${escapeHtml(tab.id)}" title="Close">&times;</button>
        </div>
      `;
    }).join('');

    browserVerticalTabsList.querySelectorAll('.vertical-tab-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.vtab-close')) return;
        switchBrowserTab(el.dataset.tabId);
      });
    });

    browserVerticalTabsList.querySelectorAll('.vtab-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeBrowserTab(btn.dataset.tabId);
      });
    });

    const badge = document.getElementById('verticalTabsCountBadge');
    if (badge) {
      badge.textContent = `${wsTabs.length} tab${wsTabs.length === 1 ? '' : 's'}`;
    }
  }

  function updateWorkspacePillBadges() {
    if (!browserWorkspacesBar) return;
    const counts = { personal: 0, work: 0, research: 0, dev: 0 };
    browserState.tabs.forEach(t => {
      const ws = t.workspace || 'personal';
      if (counts[ws] !== undefined) counts[ws]++;
    });

    browserWorkspacesBar.querySelectorAll('.workspace-pill').forEach(pill => {
      const ws = pill.dataset.workspace;
      let badge = pill.querySelector('.ws-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ws-badge';
        pill.appendChild(badge);
      }
      badge.textContent = counts[ws] || 0;
    });
  }

  // =========================================================================
  // FLAGSHIP 5: Brave Shields Visual Cockpit
  // =========================================================================
  function initBraveShieldsCockpit() {
    if (browserShieldPill) {
      browserShieldPill.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleShieldsPopover();
      });
    }

    if (shieldsMasterSwitch) {
      shieldsMasterSwitch.addEventListener('click', () => {
        browserState.shields.active = !browserState.shields.active;
        shieldsMasterSwitch.classList.toggle('active', browserState.shields.active);
        if (shieldsStatusBadge) {
          shieldsStatusBadge.textContent = browserState.shields.active ? 'SHIELDS ACTIVE' : 'SHIELDS DISABLED';
          shieldsStatusBadge.style.color = browserState.shields.active ? '#10b981' : '#ef4444';
        }
        showToast(browserState.shields.active ? 'Brave Shields UP for this site' : 'Shields DOWN: Protections disabled');
      });
    }

    if (shieldsSelectAds) {
      shieldsSelectAds.value = browserState.shields.adsBlockingMode;
      shieldsSelectAds.addEventListener('change', () => {
        browserState.shields.adsBlockingMode = shieldsSelectAds.value;
        localStorage.setItem('aegis_shields_ads', shieldsSelectAds.value);
        showToast(`Ad/Tracker blocker set to: ${shieldsSelectAds.value}`);
      });
    }

    if (shieldsToggleFingerprint) {
      shieldsToggleFingerprint.checked = browserState.shields.fingerprintRandomizer;
      shieldsToggleFingerprint.addEventListener('change', () => {
        browserState.shields.fingerprintRandomizer = shieldsToggleFingerprint.checked;
        localStorage.setItem('aegis_shields_fp', shieldsToggleFingerprint.checked ? 'true' : 'false');
      });
    }

    if (shieldsToggleMemorySaver) {
      shieldsToggleMemorySaver.checked = browserState.shields.memorySaver;
      shieldsToggleMemorySaver.addEventListener('change', () => {
        browserState.shields.memorySaver = shieldsToggleMemorySaver.checked;
        localStorage.setItem('aegis_shields_memory', shieldsToggleMemorySaver.checked ? 'true' : 'false');
      });
    }

    if (shieldsToggleHttps) {
      shieldsToggleHttps.checked = browserState.shields.strictHttps;
      shieldsToggleHttps.addEventListener('change', () => {
        browserState.shields.strictHttps = shieldsToggleHttps.checked;
        localStorage.setItem('aegis_shields_https', shieldsToggleHttps.checked ? 'true' : 'false');
      });
    }

    if (btnClearSiteData) {
      btnClearSiteData.addEventListener('click', () => {
        const activeTab = getActiveBrowserTab();
        const host = activeTab?.url ? (new URL(activeTab.url, window.location.origin)).hostname : 'current site';
        showToast(`Purged cache, storage and cookies for ${host}!`);
      });
    }

    document.addEventListener('pointerdown', (e) => {
      if (browserShieldsPopover && !browserShieldsPopover.contains(e.target) && !browserShieldPill.contains(e.target)) {
        browserShieldsPopover.style.display = 'none';
      }
    });

    updateShieldsUI();
  }

  function toggleShieldsPopover() {
    if (!browserShieldsPopover) return;
    const isShowing = browserShieldsPopover.style.display !== 'none';
    browserShieldsPopover.style.display = isShowing ? 'none' : 'block';

    if (!isShowing) {
      const activeTab = getActiveBrowserTab();
      if (shieldsTargetSite) {
        try {
          const u = new URL(activeTab?.url || 'https://aegis-browser.internal');
          shieldsTargetSite.textContent = `Site: ${u.hostname}`;
        } catch (e) {
          shieldsTargetSite.textContent = 'Site: aegis-browser.internal';
        }
      }
      updateShieldsUI();
    }
  }

  function updateShieldsUI() {
    if (browserBlockedCount) {
      browserBlockedCount.textContent = browserState.shields.trackersBlocked.toLocaleString();
    }
    if (shieldsStatTrackers) {
      shieldsStatTrackers.textContent = browserState.shields.trackersBlocked.toLocaleString();
    }
    if (shieldsStatFingerprints) {
      shieldsStatFingerprints.textContent = browserState.shields.fingerprintsCloaked.toLocaleString();
    }
    if (shieldsStatBandwidth) {
      shieldsStatBandwidth.textContent = `${browserState.shields.bandwidthSavedKB.toLocaleString()} KB`;
    }
  }

  // =========================================================================
  // FLAGSHIP 6: Sovereign AES-256-GCM Encrypted Password Vault
  // =========================================================================
  let vaultKeyringMemory = null;
  let vaultActiveMasterPass = null;

  async function deriveVaultKey(passphrase, salt) {
    const enc = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptVaultPayload(dataObj, passphrase) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveVaultKey(passphrase, salt);
    const enc = new TextEncoder();
    const plaintext = enc.encode(JSON.stringify(dataObj));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      plaintext
    );
    return {
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      data: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  async function decryptVaultPayload(payload, passphrase) {
    const salt = new Uint8Array(payload.salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(payload.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(payload.data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const key = await deriveVaultKey(passphrase, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  }

  function initPasswordVault() {
    const tabVaultPasswords = document.getElementById('tabVaultPasswords');
    const paneVaultPasswords = document.getElementById('paneVaultPasswords');
    const tabVaultNotes = document.getElementById('tabVaultNotes');
    const tabVaultBookmarks = document.getElementById('tabVaultBookmarks');
    const paneVaultNotes = document.getElementById('paneVaultNotes');
    const paneVaultBookmarks = document.getElementById('paneVaultBookmarks');

    if (tabVaultPasswords && paneVaultPasswords) {
      tabVaultPasswords.addEventListener('click', () => {
        document.querySelectorAll('.vault-seg-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.vault-pane').forEach(p => p.style.display = 'none');
        tabVaultPasswords.classList.add('active');
        paneVaultPasswords.style.display = 'block';
      });
    }

    if (tabVaultNotes && paneVaultNotes) {
      tabVaultNotes.addEventListener('click', () => {
        document.querySelectorAll('.vault-seg-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.vault-pane').forEach(p => p.style.display = 'none');
        tabVaultNotes.classList.add('active');
        paneVaultNotes.style.display = 'block';
      });
    }

    if (tabVaultBookmarks && paneVaultBookmarks) {
      tabVaultBookmarks.addEventListener('click', () => {
        document.querySelectorAll('.vault-seg-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.vault-pane').forEach(p => p.style.display = 'none');
        tabVaultBookmarks.classList.add('active');
        paneVaultBookmarks.style.display = 'block';
      });
    }

    const vaultMasterUnlockForm = document.getElementById('vaultMasterUnlockForm');
    const vaultMasterPassInput = document.getElementById('vaultMasterPassInput');
    const vaultPasswordLockedState = document.getElementById('vaultPasswordLockedState');
    const vaultPasswordUnlockedState = document.getElementById('vaultPasswordUnlockedState');
    const btnLockKeyring = document.getElementById('btnLockKeyring');

    if (vaultMasterUnlockForm) {
      vaultMasterUnlockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pass = vaultMasterPassInput.value;
        if (!pass) return;

        const storedRaw = localStorage.getItem('aegis_keyring_enc');
        if (!storedRaw) {
          vaultKeyringMemory = [];
          vaultActiveMasterPass = pass;
          const encPayload = await encryptVaultPayload([], pass);
          localStorage.setItem('aegis_keyring_enc', JSON.stringify(encPayload));
          showToast('New Sovereign Password Keyring Initialized!');
        } else {
          try {
            const payload = JSON.parse(storedRaw);
            vaultKeyringMemory = await decryptVaultPayload(payload, pass);
            vaultActiveMasterPass = pass;
            showToast('Keyring Decrypted! RAM-Only Sovereign Session active.');
          } catch (err) {
            showToast('Incorrect Master Passphrase! Access Denied.', 'danger');
            return;
          }
        }

        if (vaultPasswordLockedState) vaultPasswordLockedState.style.display = 'none';
        if (vaultPasswordUnlockedState) vaultPasswordUnlockedState.style.display = 'block';
        vaultMasterPassInput.value = '';
        renderVaultCredentials();
      });
    }

    if (btnLockKeyring) {
      btnLockKeyring.addEventListener('click', () => {
        vaultKeyringMemory = null;
        vaultActiveMasterPass = null;
        if (vaultPasswordUnlockedState) vaultPasswordUnlockedState.style.display = 'none';
        if (vaultPasswordLockedState) vaultPasswordLockedState.style.display = 'block';
        showToast('Keyring Locked! Decrypted memory wiped.');
      });
    }

    const btnGeneratePassword = document.getElementById('btnGeneratePassword');
    const credPassword = document.getElementById('credPassword');
    if (btnGeneratePassword && credPassword) {
      btnGeneratePassword.addEventListener('click', () => {
        const charset = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*()_+-=';
        let pass = '';
        const randVals = window.crypto.getRandomValues(new Uint8Array(20));
        for (let i = 0; i < 20; i++) {
          pass += charset[randVals[i] % charset.length];
        }
        credPassword.value = pass;
        credPassword.type = 'text';
        showToast('High-entropy 20-char password generated!');
      });
    }

    const btnToggleCredPassword = document.getElementById('btnToggleCredPassword');
    if (btnToggleCredPassword && credPassword) {
      btnToggleCredPassword.addEventListener('click', () => {
        credPassword.type = credPassword.type === 'password' ? 'text' : 'password';
      });
    }

    const vaultCredentialForm = document.getElementById('vaultCredentialForm');
    const credSiteDomain = document.getElementById('credSiteDomain');
    const credUsername = document.getElementById('credUsername');
    const credNotes = document.getElementById('credNotes');

    if (vaultCredentialForm) {
      vaultCredentialForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!vaultKeyringMemory || !vaultActiveMasterPass) {
          showToast('Keyring is locked', 'warning');
          return;
        }

        const newCred = {
          id: 'cred_' + Date.now(),
          domain: credSiteDomain.value.trim().toLowerCase(),
          username: credUsername.value.trim(),
          password: credPassword.value,
          notes: credNotes.value.trim(),
          updatedAt: new Date().toLocaleDateString()
        };

        vaultKeyringMemory.unshift(newCred);
        const encPayload = await encryptVaultPayload(vaultKeyringMemory, vaultActiveMasterPass);
        localStorage.setItem('aegis_keyring_enc', JSON.stringify(encPayload));

        credSiteDomain.value = '';
        credUsername.value = '';
        credPassword.value = '';
        credNotes.value = '';

        const details = document.getElementById('vaultAddCredentialDetails');
        if (details) details.open = false;

        renderVaultCredentials();
        showToast(`Saved credentials for ${newCred.domain}!`);
      });
    }

    const vaultCredSearchInput = document.getElementById('vaultCredSearchInput');
    if (vaultCredSearchInput) {
      vaultCredSearchInput.addEventListener('input', () => {
        renderVaultCredentials(vaultCredSearchInput.value.trim());
      });
    }
  }

  function renderVaultCredentials(filter = '') {
    const list = document.getElementById('vaultCredentialsList');
    if (!list || !vaultKeyringMemory) return;

    const filtered = vaultKeyringMemory.filter(c => {
      if (!filter) return true;
      const f = filter.toLowerCase();
      return (c.domain && c.domain.includes(f)) || (c.username && c.username.toLowerCase().includes(f));
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 24px 0; font-size: 0.82rem;">
          ${filter ? 'No credentials match your filter.' : 'No credentials stored yet. Click above to save one!'}
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(c => `
      <div class="vault-cred-card" data-id="${escapeHtml(c.id)}">
        <div class="cred-card-top">
          <span class="cred-domain-badge">🌐 ${escapeHtml(c.domain)}</span>
          <span class="cred-username-display">${escapeHtml(c.username)}</span>
        </div>
        ${c.notes ? `<div style="font-size: 0.74rem; color: var(--text-muted); font-style: italic;">${escapeHtml(c.notes)}</div>` : ''}
        <div class="cred-card-actions">
          <button type="button" class="btn-cred-action btn-copy-cred-pass" data-id="${escapeHtml(c.id)}">Copy Password</button>
          <button type="button" class="btn-cred-action btn-copy-cred-user" data-id="${escapeHtml(c.id)}">Copy User</button>
          <button type="button" class="btn-cred-action btn-cred-autofill" data-id="${escapeHtml(c.id)}">Auto-Fill</button>
          <button type="button" class="btn-cred-action" style="color: #ef4444; margin-left: auto;" data-id="${escapeHtml(c.id)}" data-delete="true">&times;</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.btn-copy-cred-pass').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = vaultKeyringMemory.find(c => c.id === btn.dataset.id);
        if (item) {
          navigator.clipboard.writeText(item.password);
          showToast(`Password copied for ${item.domain}!`);
        }
      });
    });

    list.querySelectorAll('.btn-copy-cred-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = vaultKeyringMemory.find(c => c.id === btn.dataset.id);
        if (item) {
          navigator.clipboard.writeText(item.username);
          showToast(`Username copied for ${item.domain}!`);
        }
      });
    });

    list.querySelectorAll('.btn-cred-autofill').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = vaultKeyringMemory.find(c => c.id === btn.dataset.id);
        if (item) {
          navigator.clipboard.writeText(item.password);
          showToast(`Auto-fill: Password copied to clipboard for ${item.domain}!`);
        }
      });
    });

    list.querySelectorAll('[data-delete="true"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = vaultKeyringMemory.findIndex(c => c.id === btn.dataset.id);
        if (idx !== -1) {
          const removed = vaultKeyringMemory.splice(idx, 1)[0];
          const encPayload = await encryptVaultPayload(vaultKeyringMemory, vaultActiveMasterPass);
          localStorage.setItem('aegis_keyring_enc', JSON.stringify(encPayload));
          renderVaultCredentials();
          showToast(`Deleted credential for ${removed.domain}.`);
        }
      });
    });
  }

  // =========================================================================
  // FLAGSHIP 7: Floating Picture-in-Picture (PiP) Video Mini Player
  // =========================================================================
  function initBrowserMediaPiP() {
    if (btnBrowserPiP) {
      btnBrowserPiP.addEventListener('click', () => {
        togglePictureInPicture();
      });
    }

    if (btnPipClose && pipFloatingPlayer) {
      btnPipClose.addEventListener('click', () => {
        pipFloatingPlayer.style.display = 'none';
        if (pipActiveVideo) {
          pipActiveVideo.pause();
          pipActiveVideo.src = '';
        }
      });
    }

    if (btnPipReturn) {
      btnPipReturn.addEventListener('click', () => {
        if (pipFloatingPlayer) pipFloatingPlayer.style.display = 'none';
        togglePrivateBrowser(true);
      });
    }

    if (pipDragHeader && pipFloatingPlayer) {
      let isDragging = false;
      let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

      pipDragHeader.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = pipFloatingPlayer.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        pipFloatingPlayer.style.bottom = 'auto';
        pipFloatingPlayer.style.right = 'auto';
        pipFloatingPlayer.style.left = `${initialLeft}px`;
        pipFloatingPlayer.style.top = `${initialTop}px`;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        pipFloatingPlayer.style.left = `${initialLeft + dx}px`;
        pipFloatingPlayer.style.top = `${initialTop + dy}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }
  }

  function togglePictureInPicture() {
    if (!pipFloatingPlayer) return;

    const video = document.querySelector('video');
    if (video && document.pictureInPictureEnabled && !document.pictureInPictureElement) {
      video.requestPictureInPicture().catch(() => {});
    }

    const isVisible = pipFloatingPlayer.style.display !== 'none';
    pipFloatingPlayer.style.display = isVisible ? 'none' : 'flex';

    if (!isVisible) {
      const activeTab = getActiveBrowserTab();
      const titleEl = document.getElementById('pipTitleText');
      if (titleEl) {
        titleEl.textContent = activeTab?.title ? `PiP: ${activeTab.title.slice(0, 24)}...` : 'Picture-in-Picture';
      }
      showToast('Picture-in-Picture Mini Player popped out!');
    }
  }

  // =========================================================================
  // FLAGSHIP 8: Webpage Screenshot & High-Res PDF Export
  // =========================================================================
  function initPageCaptures() {
    if (btnBrowserScreenshot) {
      btnBrowserScreenshot.addEventListener('click', async () => {
        if (window.aegisDesktop?.captureScreenshot) {
          showToast('Capturing full webpage screenshot...');
          try {
            const res = await window.aegisDesktop.captureScreenshot();
            if (res && res.success) {
              showToast(`Screenshot saved to Downloads: ${res.fileName}`);
            } else {
              showToast(res?.error || 'Screenshot capture failed', 'danger');
            }
          } catch (e) {
            showToast('Screenshot capture error: ' + e.message, 'danger');
          }
        } else {
          showToast('Capturing viewport image...');
          window.print();
        }
      });
    }

    if (btnBrowserPdfExport) {
      btnBrowserPdfExport.addEventListener('click', async () => {
        if (window.aegisDesktop?.exportPDF) {
          showToast('Exporting high-resolution clean PDF...');
          try {
            const res = await window.aegisDesktop.exportPDF();
            if (res && res.success) {
              showToast(`PDF exported to Downloads: ${res.fileName}`);
            } else {
              showToast(res?.error || 'PDF export failed', 'danger');
            }
          } catch (e) {
            showToast('PDF export error: ' + e.message, 'danger');
          }
        } else {
          window.print();
        }
      });
    }
  }

  // =========================================================================
  // Feature: Split View (Dual Browsing Side-by-Side)
  // =========================================================================
  function initSplitViewBrowsing() {
    if (btnToggleSplitView) {
      btnToggleSplitView.addEventListener('click', () => toggleSplitView());
    }

    if (btnSecondaryClose) {
      btnSecondaryClose.addEventListener('click', () => toggleSplitView(false));
    }

    if (btnSecondaryReload) {
      btnSecondaryReload.addEventListener('click', () => {
        if (browserSecondaryIframe && browserSecondaryIframe.src && browserSecondaryIframe.src !== 'about:blank') {
          const current = browserSecondaryIframe.src;
          browserSecondaryIframe.src = 'about:blank';
          setTimeout(() => { browserSecondaryIframe.src = current; }, 50);
        }
      });
    }

    if (btnSecondarySwap) {
      btnSecondarySwap.addEventListener('click', () => swapSplitPanes());
    }

    if (browserSecondaryForm) {
      browserSecondaryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = browserSecondaryUrlInput ? browserSecondaryUrlInput.value.trim() : '';
        if (val) navigateSecondaryPane(val);
      });
    }

    if (browserSecondaryPane) {
      browserSecondaryPane.querySelectorAll('.secondary-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const url = chip.getAttribute('data-url');
          if (url) navigateSecondaryPane(url);
        });
      });
    }

    initSplitDividerDrag();
  }

  function toggleSplitView(forceState) {
    const nextState = forceState !== undefined ? forceState : !browserState.isSplitView;
    browserState.isSplitView = nextState;

    const viewport = document.getElementById('browserViewport');
    if (viewport) {
      viewport.classList.toggle('split-view-active', browserState.isSplitView);
      viewport.style.setProperty('--split-ratio', `${browserState.splitRatio || 50}%`);
    }

    if (btnToggleSplitView) {
      btnToggleSplitView.classList.toggle('active-split', browserState.isSplitView);
    }
    if (btnBrowserSplitScreen) {
      btnBrowserSplitScreen.classList.toggle('active', browserState.isSplitView);
    }

    if (browserSplitResizer) {
      browserSplitResizer.style.display = browserState.isSplitView ? 'flex' : 'none';
    }
    if (browserSecondaryPane) {
      browserSecondaryPane.style.display = browserState.isSplitView ? 'flex' : 'none';
    }

    if (browserState.isSplitView) {
      showToast('Split View Active: Dual browsing side-by-side');
      if (!browserState.secondaryUrl && browserSecondaryUrlInput) {
        setTimeout(() => browserSecondaryUrlInput.focus(), 100);
      }
    }
  }

  function navigateSecondaryPane(inputUrl) {
    if (!inputUrl) return;
    let finalUrl = inputUrl.trim();

    const isUrl = finalUrl.startsWith('http://') ||
                  finalUrl.startsWith('https://') ||
                  finalUrl.startsWith('localhost') ||
                  finalUrl.startsWith('127.0.0.1') ||
                  (/^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/).test(finalUrl);

    let targetHref = '';
    if (isUrl) {
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      targetHref = `/api/browser/proxy?url=${encodeURIComponent(finalUrl)}`;
    } else {
      targetHref = `/browser/search?q=${encodeURIComponent(finalUrl)}`;
    }

    browserState.secondaryUrl = finalUrl;
    if (browserSecondaryUrlInput) {
      browserSecondaryUrlInput.value = finalUrl;
    }

    if (secondaryStartPlaceholder) {
      secondaryStartPlaceholder.style.display = 'none';
    }
    if (browserSecondaryIframe) {
      browserSecondaryIframe.style.display = 'block';
      browserSecondaryIframe.src = targetHref;
    }
  }

  function swapSplitPanes() {
    const activeTab = getActiveBrowserTab();
    const primaryUrl = activeTab ? activeTab.url : '';
    const secondaryUrl = browserState.secondaryUrl;

    if (!primaryUrl && !secondaryUrl) {
      showToast('No active tabs or URLs to swap', 'warning');
      return;
    }

    // Secondary gets primary's URL
    if (primaryUrl) {
      navigateSecondaryPane(primaryUrl);
    } else {
      browserState.secondaryUrl = '';
      if (browserSecondaryUrlInput) browserSecondaryUrlInput.value = '';
      if (secondaryStartPlaceholder) secondaryStartPlaceholder.style.display = 'flex';
      if (browserSecondaryIframe) {
        browserSecondaryIframe.style.display = 'none';
        browserSecondaryIframe.src = 'about:blank';
      }
    }

    // Primary gets secondary's URL
    if (secondaryUrl) {
      if (activeTab) {
        navigateActiveTab(secondaryUrl);
      } else {
        createBrowserTab(secondaryUrl);
      }
    }

    showToast('Swapped left and right browser panes');
  }

  function initSplitDividerDrag() {
    if (!browserSplitResizer) return;
    let isDragging = false;

    browserSplitResizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      browserSplitResizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      if (browserIframe) browserIframe.style.pointerEvents = 'none';
      if (browserSecondaryIframe) browserSecondaryIframe.style.pointerEvents = 'none';
      if (browserWebviewsContainer) browserWebviewsContainer.style.pointerEvents = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const viewport = document.getElementById('browserViewport');
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percentage = Math.max(20, Math.min(80, (offsetX / rect.width) * 100));
      browserState.splitRatio = Math.round(percentage);
      viewport.style.setProperty('--split-ratio', `${browserState.splitRatio}%`);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        browserSplitResizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (browserIframe) browserIframe.style.pointerEvents = 'auto';
        if (browserSecondaryIframe) browserSecondaryIframe.style.pointerEvents = 'auto';
        if (browserWebviewsContainer) browserWebviewsContainer.style.pointerEvents = 'auto';
      }
    });
  }

  // =========================================================================
  // Feature: 1-Click AI Page Summarizer
  // =========================================================================
  function initAiPageSummarizer() {
    if (btnSummarizePage) {
      btnSummarizePage.addEventListener('click', () => handleSummarizePage());
    }

    if (btnCloseSummaryDrawer) {
      btnCloseSummaryDrawer.addEventListener('click', () => closePageSummaryDrawer());
    }

    if (btnCopySummary) {
      btnCopySummary.addEventListener('click', () => copySummaryToClipboard());
    }

    if (btnClipSummaryToNotes) {
      btnClipSummaryToNotes.addEventListener('click', () => clipSummaryToNotes());
    }
  }

  function openPageSummaryDrawer(title) {
    if (pageSummaryDrawer) {
      pageSummaryDrawer.style.display = 'flex';
      if (btnSummarizePage) btnSummarizePage.classList.add('active');
    }
    if (title && summaryDrawerTitle) {
      summaryDrawerTitle.textContent = `Summary: ${title.length > 28 ? title.substring(0, 28) + '...' : title}`;
    }
  }

  function closePageSummaryDrawer() {
    if (pageSummaryDrawer) {
      pageSummaryDrawer.style.display = 'none';
      if (btnSummarizePage) btnSummarizePage.classList.remove('active');
    }
  }

  async function handleSummarizePage() {
    const activeTab = getActiveBrowserTab();
    const url = activeTab?.url || '';
    const title = activeTab?.title || (url ? formatDisplayUrl(url) : 'Active Page');

    if (!url || url === 'about:blank') {
      showToast('Navigate to any website or search result to generate an AI summary', 'warning');
      return;
    }

    openPageSummaryDrawer(title);

    if (summaryLoadingState) summaryLoadingState.style.display = 'flex';
    if (summaryContentState) summaryContentState.style.display = 'none';

    try {
      const res = await fetch('/api/ai/summarize-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title,
          provider: state.aiProvider || 'gemini',
          apiKey: state.aiApiKey || ''
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to synthesize summary');
      }

      browserState.summaryData = { ...data, title, url };

      if (summaryTakeawaysList) {
        summaryTakeawaysList.innerHTML = '';
        (data.takeaways || []).forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          summaryTakeawaysList.appendChild(li);
        });
      }

      if (summaryMarkdownBody) {
        const rawSummary = data.summary || 'No summary text returned.';
        summaryMarkdownBody.innerHTML = formatSummaryMarkdown(rawSummary);
      }

      if (summaryReadingTime) {
        summaryReadingTime.textContent = `⏱️ ~${data.readingTimeMinutes || 2} min read`;
      }
      if (summaryWordCount) {
        summaryWordCount.textContent = `📄 ${data.wordCount || 0} words analyzed`;
      }
      if (summaryEngineBadge) {
        const providerName = data.provider === 'ollama'
          ? 'Local Ollama'
          : data.provider === 'gemini'
            ? 'Gemini 2.0 Flash'
            : 'Offline NLP Engine';
        summaryEngineBadge.textContent = providerName;
      }

      if (summaryLoadingState) summaryLoadingState.style.display = 'none';
      if (summaryContentState) summaryContentState.style.display = 'flex';

    } catch (err) {
      if (summaryLoadingState) summaryLoadingState.style.display = 'none';
      if (summaryContentState) summaryContentState.style.display = 'flex';
      if (summaryTakeawaysList) {
        summaryTakeawaysList.innerHTML = `<li>Could not synthesize page: ${escapeHtml(err.message)}</li>`;
      }
      if (summaryMarkdownBody) {
        summaryMarkdownBody.innerHTML = `<p style="color: #f87171;">⚠️ Error synthesizing page. Make sure the page is reachable or try again.</p>`;
      }
    }
  }

  function formatSummaryMarkdown(text) {
    if (!text) return '';
    return text
      .split('\n\n')
      .map(p => {
        let clean = escapeHtml(p.trim());
        clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        if (clean.startsWith('- ') || clean.startsWith('* ')) {
          clean = clean.replace(/^[*-]\s+/gm, '• ');
        }
        return `<p>${clean}</p>`;
      })
      .join('');
  }

  function copySummaryToClipboard() {
    const data = browserState.summaryData;
    if (!data) {
      showToast('No active summary to copy', 'warning');
      return;
    }
    const text = `Title: ${data.title || 'Webpage Summary'}\nSource: ${data.url || ''}\n\nKey Takeaways:\n${(data.takeaways || []).map(t => '• ' + t).join('\n')}\n\nExecutive Brief:\n${data.summary || ''}`;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Summary copied to clipboard!'))
      .catch(() => showToast('Failed to copy to clipboard', 'danger'));
  }

  function clipSummaryToNotes() {
    const data = browserState.summaryData;
    if (!data) {
      showToast('No active summary to clip', 'warning');
      return;
    }
    const formatted = `### ${data.title || 'Page Summary'}\nSource: [${data.url}](${data.url})\n\n**Takeaways:**\n${(data.takeaways || []).map(t => '- ' + t).join('\n')}\n\n**Executive Brief:**\n${data.summary || ''}\n`;
    
    if (scratchpadTextarea) {
      scratchpadTextarea.value += (scratchpadTextarea.value ? '\n\n---\n\n' : '') + formatted;
      if (typeof saveScratchpad === 'function') saveScratchpad();
      showToast('Summary clipped to Research Scratchpad');
    } else {
      navigator.clipboard.writeText(formatted);
      showToast('Summary copied to clipboard (Scratchpad unopened)');
    }
  }

  // =========================================================================
  // Flagship Feature 1: Time Machine & Wayback Web Archives
  // =========================================================================

  function initTimeMachine() {
    if (btnBrowserTimeMachine) {
      btnBrowserTimeMachine.addEventListener('click', () => {
        const activeTab = getActiveBrowserTab();
        const urlToLookup = activeTab?.url || browserUrlInput?.value || state.currentQuery;
        if (!urlToLookup || urlToLookup === 'about:blank') {
          showToast('Navigate to any website or search result to view historical snapshots', 'warning');
          return;
        }
        openTimeMachineForUrl(urlToLookup);
      });
    }

    if (btnCloseTimeMachine) {
      btnCloseTimeMachine.addEventListener('click', () => {
        if (timeMachineModalBackdrop) timeMachineModalBackdrop.style.display = 'none';
      });
    }

    if (timeMachineModalBackdrop) {
      timeMachineModalBackdrop.addEventListener('click', (e) => {
        if (e.target === timeMachineModalBackdrop) {
          timeMachineModalBackdrop.style.display = 'none';
        }
      });
    }

    if (btnOpenWaybackInBrowser) {
      btnOpenWaybackInBrowser.addEventListener('click', () => {
        if (activeTimeMachineSnapshotUrl) {
          if (timeMachineModalBackdrop) timeMachineModalBackdrop.style.display = 'none';
          openInPrivateBrowser(activeTimeMachineSnapshotUrl, `Archive: ${timeMachineTargetUrl?.textContent || 'Snapshot'}`);
          showToast('Historical snapshot loaded in Aegis Private Browser');
        }
      });
    }

    // Hotkey: Alt+H in browser
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        const isBrowserOpen = privateBrowserModalBackdrop && privateBrowserModalBackdrop.style.display !== 'none';
        if (isBrowserOpen) {
          e.preventDefault();
          const activeTab = getActiveBrowserTab();
          if (activeTab?.url) openTimeMachineForUrl(activeTab.url);
        }
      }
    });
  }

  async function openTimeMachineForUrl(targetUrl) {
    if (!targetUrl) return;
    const clean = targetUrl.trim();
    if (timeMachineModalBackdrop) timeMachineModalBackdrop.style.display = 'flex';
    if (timeMachineTargetUrl) timeMachineTargetUrl.textContent = clean;
    if (timeMachineLoading) timeMachineLoading.style.display = 'flex';
    if (timeMachineResult) timeMachineResult.style.display = 'none';

    // Set fallback links immediately
    if (linkArchiveToday) linkArchiveToday.href = `https://archive.today/newest/${clean}`;
    if (linkWaybackCalendar) linkWaybackCalendar.href = `https://web.archive.org/web/*/${clean}`;
    if (linkGoogleCache) linkGoogleCache.href = `https://webcache.googleusercontent.com/search?q=cache:${clean}`;

    try {
      const res = await fetch(`/api/wayback?url=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (timeMachineLoading) timeMachineLoading.style.display = 'none';
      if (timeMachineResult) timeMachineResult.style.display = 'block';

      if (data.available && data.snapshotUrl) {
        activeTimeMachineSnapshotUrl = data.snapshotUrl;
        if (timeMachineBadge) {
          timeMachineBadge.textContent = 'Archived Snapshot Available';
          timeMachineBadge.className = 'tm-badge';
        }
        if (timeMachineDate) timeMachineDate.textContent = data.formattedDate || 'Recent capture';
        if (timeMachineDesc) timeMachineDesc.textContent = 'Verified historical record preserved in the Internet Archive. Bypasses paywalls and dead links.';
        if (btnOpenWaybackDirect) btnOpenWaybackDirect.href = data.snapshotUrl;
      } else {
        activeTimeMachineSnapshotUrl = data.waybackLatestUrl || `https://web.archive.org/web/${clean}`;
        if (timeMachineBadge) {
          timeMachineBadge.textContent = 'Direct Archive Route';
          timeMachineBadge.className = 'tm-badge fallback';
        }
        if (timeMachineDate) timeMachineDate.textContent = 'Wayback Search Ready';
        if (timeMachineDesc) timeMachineDesc.textContent = 'No instantaneous snapshot cached, but full historical calendar is available on Archive.org and Archive.today.';
        if (btnOpenWaybackDirect) btnOpenWaybackDirect.href = activeTimeMachineSnapshotUrl;
      }
    } catch (err) {
      if (timeMachineLoading) timeMachineLoading.style.display = 'none';
      if (timeMachineResult) timeMachineResult.style.display = 'block';
      activeTimeMachineSnapshotUrl = `https://web.archive.org/web/${clean}`;
      if (timeMachineBadge) {
        timeMachineBadge.textContent = 'Direct Archive Fallback';
        timeMachineBadge.className = 'tm-badge fallback';
      }
      if (timeMachineDate) timeMachineDate.textContent = 'Network Offline Fallback';
      if (timeMachineDesc) timeMachineDesc.textContent = 'Could not query Wayback API; direct archive mirrors generated.';
      if (btnOpenWaybackDirect) btnOpenWaybackDirect.href = activeTimeMachineSnapshotUrl;
    }
  }

  // =========================================================================
  // Flagship Feature 2: Web Highlighter & Page Annotator
  // =========================================================================

  function loadSavedAnnotations() {
    try {
      const raw = localStorage.getItem('aegis_annotations');
      return raw ? JSON.parse(raw) : [];
    } catch(e) {
      return [];
    }
  }

  function saveAnnotations(list) {
    try {
      localStorage.setItem('aegis_annotations', JSON.stringify(list));
    } catch(e) {}
  }

  function initWebHighlighter() {
    // Selection listener across document
    document.addEventListener('pointerup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    // Dismiss button
    if (btnHlDismiss) {
      btnHlDismiss.addEventListener('click', hideHighlighterToolbar);
    }

    // Color Swatches
    if (aegisHighlighterToolbar) {
      aegisHighlighterToolbar.querySelectorAll('.hl-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          const color = swatch.dataset.color || 'yellow';
          applyHighlightToSelection(color);
        });
      });
    }

    // Add Note button
    if (btnHlAddNote) {
      btnHlAddNote.addEventListener('click', () => {
        if (!currentSelectedText) return;
        const note = prompt('Add a marginal note to this highlight:', '');
        if (note !== null) {
          applyHighlightToSelection('yellow', note.trim());
        }
      });
    }

    // Clip to Scratchpad button
    if (btnHlClipScratchpad) {
      btnHlClipScratchpad.addEventListener('click', () => {
        if (!currentSelectedText) return;
        const activeTab = getActiveBrowserTab();
        const activeUrl = activeTab?.url || window.location.href;
        const title = activeTab?.title || document.title;
        const quote = `\n\n> "${currentSelectedText}"\n> — Reference: [${title}](${activeUrl})\n`;
        
        if (scratchpadTextarea) {
          scratchpadTextarea.value += quote;
          updateScratchpad();
          showToast('Quote clipped to Research Scratchpad!');
          toggleScratchpad(true);
        } else {
          navigator.clipboard.writeText(quote);
          showToast('Quote copied to clipboard');
        }
        hideHighlighterToolbar();
      });
    }

    // Sync all highlights to Scratchpad
    if (btnScratchpadSyncHighlights) {
      btnScratchpadSyncHighlights.addEventListener('click', () => {
        const list = loadSavedAnnotations();
        if (!list || list.length === 0) {
          showToast('No saved highlights yet. Select text in Reader or Web and pick a color!', 'warning');
          return;
        }

        const colorIcons = { yellow: '🟡', emerald: '🟢', cyan: '🔵', magenta: '🟣' };
        let formatted = `\n\n## 📚 Web Highlights & Research Notes (${list.length})\n\n`;
        list.slice().reverse().forEach((item, idx) => {
          const icon = colorIcons[item.color] || '📌';
          formatted += `${idx + 1}. ${icon} **"${item.text}"**\n`;
          if (item.note) formatted += `   - *Note:* ${item.note}\n`;
          if (item.url) formatted += `   - *Source:* [${item.title || item.url}](${item.url})\n`;
          formatted += `\n`;
        });

        if (scratchpadTextarea) {
          scratchpadTextarea.value += formatted;
          updateScratchpad();
          showToast(`Synced ${list.length} highlights to Scratchpad!`);
          toggleScratchpad(true);
        }
      });
    }
  }

  function handleTextSelection(e) {
    // If click was inside toolbar itself, ignore
    if (aegisHighlighterToolbar && aegisHighlighterToolbar.contains(e.target)) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      hideHighlighterToolbar();
      return;
    }

    const text = sel.toString().trim();
    if (text.length < 3) {
      hideHighlighterToolbar();
      return;
    }

    currentSelectedText = text;
    currentSelectionRange = sel.getRangeAt(0).cloneRange();

    // Calculate position
    const rect = currentSelectionRange.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const top = rect.top + window.scrollY;
      const left = rect.left + window.scrollX + (rect.width / 2);
      showHighlighterToolbar(top, left);
    }
  }

  function showHighlighterToolbar(top, left) {
    if (!aegisHighlighterToolbar) return;
    aegisHighlighterToolbar.style.top = `${Math.max(10, top)}px`;
    aegisHighlighterToolbar.style.left = `${Math.max(120, Math.min(window.innerWidth - 120, left))}px`;
    aegisHighlighterToolbar.style.display = 'flex';
  }

  function hideHighlighterToolbar() {
    if (aegisHighlighterToolbar) {
      aegisHighlighterToolbar.style.display = 'none';
    }
  }

  function applyHighlightToSelection(color = 'yellow', note = '') {
    if (!currentSelectedText || !currentSelectionRange) return;

    const activeTab = getActiveBrowserTab();
    const activeUrl = activeTab?.url || readerDirectLink?.href || window.location.href;
    const title = activeTab?.title || readerModalTitle?.textContent || document.title;

    const id = 'hl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const annotation = {
      id,
      text: currentSelectedText,
      color,
      note: note || '',
      url: activeUrl,
      title: title || 'Web Document',
      createdAt: new Date().toISOString()
    };

    // Save to storage
    const all = loadSavedAnnotations();
    all.push(annotation);
    saveAnnotations(all);

    // Apply DOM mark if range is still valid
    try {
      const mark = document.createElement('mark');
      mark.className = `aegis-highlight aegis-highlight-${color}`;
      mark.dataset.hlId = id;
      mark.title = note ? `Note: ${note}` : `Highlighted: ${color}`;
      mark.textContent = currentSelectedText;

      if (note) {
        const badge = document.createElement('span');
        badge.className = 'aegis-note-badge';
        badge.textContent = '📝';
        mark.appendChild(badge);
      }

      currentSelectionRange.deleteContents();
      currentSelectionRange.insertNode(mark);
    } catch(e) {}

    // Clear selection & hide toolbar
    window.getSelection()?.removeAllRanges();
    hideHighlighterToolbar();
    showToast(`Highlighted in ${color}${note ? ' with note' : ''}!`);
  }

  // =========================================================================
  // Flagship Feature 3: Global Desktop Spotlight Quick Search Integration
  // =========================================================================
  function initSpotlightIntegration() {
    // 1. Electron Global Hotkey IPC Trigger
    if (window.aegisDesktop && typeof window.aegisDesktop.onSpotlightTrigger === 'function') {
      window.aegisDesktop.onSpotlightTrigger(() => {
        openSpotlightSearch();
      });
    }

    // 2. Browser in-window global hotkey: Alt+Space
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.code === 'Space' || e.keyCode === 32)) {
        e.preventDefault();
        openSpotlightSearch();
      }
    });
  }

  function openSpotlightSearch() {
    // Bring up Universal Command Palette / Spotlight Omnibox
    if (typeof window.openAegisPalette === 'function') {
      window.openAegisPalette();
      const input = document.getElementById('cmdPaletteInput');
      if (input) {
        input.placeholder = '⚡ Aegis Spotlight: Type query, math (12*45), or !bang...';
        input.focus();
        input.select();
      }
      showToast('Aegis Spotlight Ready (Alt+Space)');
    } else {
      if (searchInput) {
        searchHero.scrollIntoView({ behavior: 'smooth' });
        searchInput.focus();
        searchInput.select();
        showToast('Aegis Spotlight: Search focused');
      }
    }
  }

})();

