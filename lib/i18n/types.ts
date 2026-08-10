export type Locale = "uz" | "ru" | "en"

export interface Dict {
  locale: Locale

  nav: {
    pricing: string
    login: string
    start: string
    menuOpen: string
    menuClose: string
  }

  footer: {
    pricing: string
    privacy: string
    terms: string
    dataDeletion: string
  }

  sidebar: {
    home: string
    stats: string
    inbox: string
    campaigns: string
    telegram: string
    flows: string
    broadcasts: string
    logs: string
    settings: string
    diagnostics: string
    logOut: string
    planFree: string
    planStandard: string
    planPro: string
    planAgency: string
  }

  topBar: {
    menuOpen: string
    connect: string
    accounts: string
    // page title map keys match trimmed pathname (after /${lang})
    pageTitles: Record<string, string>
  }

  home: {
    metaTitle: string
    metaDesc: string
    heroLine1: string
    heroLine2: string
    heroLine3: string
    heroSub: string
    ctaPrimary: string
    ctaSecondary: string
    stepsH2: string
    stepsSub: string
    step1Title: string
    step1Desc: string
    step2Title: string
    step2Desc: string
    step3Title: string
    step3Desc: string
    featuresH2: string
    featuresSub: string
    feat1Title: string
    feat1Desc: string
    feat2Title: string
    feat2Desc: string
    feat3Title: string
    feat3Desc: string
    supporting: [string, string, string, string, string, string]
    pricingH2: string
    pricingSub: string
    pricingFreeNote: string
    pricingStdNote: string
    pricingProNote: string
    pricingLink: string
    ctaH2: string
    ctaSub: string
    ctaBtn1: string
    ctaBtn2: string
    // Mock dashboard widget labels
    mockGreeting: string
    mockSub: string
    mockChart: string
    mockActivity: string
    mockStats: {
      activeCampaigns: string
      dmsSent: string
      skipped: string
      failed: string
      clicks: string
      ctr: string
    }
    mockActivityRows: [
      { label: string; status: string },
      { label: string; status: string },
      { label: string; status: string },
    ]
    mockStatusSent: string
    mockStatusQueued: string
  }

  pricing: {
    metaTitle: string
    metaDesc: string
    banner: string
    h1: string
    sub: string
    badge: string
    freeName: string
    freeDesc: string
    freeCta: string
    stdName: string
    stdDesc: string
    stdCta: string
    stdSavings: string
    proName: string
    proDesc: string
    proCta: string
    proSavings: string
    features: {
      ig1: string
      ig2: string
      campaigns2: string
      campaignsUnlimited: string
      dms100: string
      dms3000: string
      dmsUnlimited: string
      keywordTrigger: string
      autoDm: string
      commentReply: string
      analytics: string
      inboundDm: string
      followGate: string
      trackedLinks: string
      clientReports: string
      csvImport: string
      multiUser: string
      prioritySupport: string
    }
    ig5: string
    questions: string
    telegramLink: string
  }

  login: {
    metaTitle: string
    metaDesc: string
    subDefault: string
    subTemplate: string
    templateSelected: string
    checkEmailH2: string
    checkEmailSub: string
    emailLabel: string
    emailPlaceholder: string
    submitBtn: string
    passwordLabel: string
    passwordPlaceholder: string
    submitPassword: string
    useLinkInstead: string
    usePasswordInstead: string
    forgotPassword: string
    errInvalid: string
    noAccount: string
    signUpLink: string
  }

  signup: {
    metaTitle: string
    metaDesc: string
    h1: string
    sub: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    passwordHint: string
    submitBtn: string
    haveAccount: string
    signInLink: string
    errInvalidEmail: string
    errTooShort: string
    errTaken: string
  }

  verifyEmail: {
    banner: string
    resend: string
    sent: string
  }

  setPassword: {
    metaTitle: string
    metaDesc: string
    h1: string
    sub: string
    passwordLabel: string
    confirmLabel: string
    submitBtn: string
    errTooShort: string
    errMismatch: string
  }

  dashboard: {
    greeting: string
    connectedAccounts: string
    contacts: string
    activity: string
    onboardingTitle: string
    onboardingProgress: string
    onboardingStep1: string
    onboardingStep2: string
    onboardingStep3: string
    onboardingStart: string
    dmLimitTitle: string
    upgradeWarning: string
    upgradeLinkText: string
    stat1Label: string
    stat2Label: string
    statActiveCampaigns: string
    statClicks: string
    statSkipped: string
    statFailed: string
    chartTitle: string
    keywordsTitle: string
    noKeywords: string
    noKeywordsSub: string
    activityTitle: string
    noActivity: string
    noActivitySub: string
    createCampaign: string
  }

  flows: {
    title: string
    subtitle: string
    newBtn: string
    countLabel: string
    emptyTitle: string
    emptyDesc: string
    templatePickerTitle: string
    templatePickerDesc: string
    startBlank: string
    stepCount: string
    conversationCount: string
    statusActive: string
    statusPaused: string
    hasErrors: string
    hasWarnings: string
    deleteConfirm: string
    deleteBtn: string
    cancelBtn: string
    createFailed: string
    nameLabel: string
    namePlaceholder: string
  }

  broadcasts: {
    title: string
    subtitle: string
    newBtn: string
    messageLabel: string
    messagePlaceholder: string
    audienceLabel: string
    audienceAll: string
    previewBtn: string
    reachLabel: string
    confirmTitle: string
    confirmBody: string
    confirmTypeLabel: string
    confirmWord: string
    sendBtn: string
    sending: string
    cancelBtn: string
    emptyTitle: string
    emptyDesc: string
    noAudience: string
    tooLarge: string
    audienceChanged: string
    failed: string
    statusDraft: string
    statusSending: string
    statusCompleted: string
    progress: string
    irreversible: string
    // own-bot gate (D5) — inline connect form shown directly on the broadcasts page
    noBotTitle: string
    noBotDesc: string
    noBotTokenLabel: string
    noBotTokenPlaceholder: string
    noBotTutorialLabel: string
    noBotTutorialFallback: string
    noBotSave: string
    noBotSaving: string
    noBotInvalid: string
    botConnected: string
    disconnectBot: string
    disconnectTitle: string
    disconnectDesc: string
    disconnectTypeLabel: string
    disconnectWord: string
    disconnectConfirm: string
    disconnectCancel: string
    disconnecting: string
    disconnectFailed: string
    disconnectBlocked: string
  }

  flowEditor: {
    backToFlows: string
    rootCrumb: string
    save: string
    saving: string
    saved: string
    saveFailed: string
    tabEdit: string
    tabPreview: string
    messageLabel: string
    messagePlaceholder: string
    saveAnswerLabel: string
    saveAnswerPlaceholder: string
    optionsLabel: string
    addOption: string
    optionLabelPlaceholder: string
    optionEnds: string
    optionGoesTo: string
    openBranch: string
    addStep: string
    deleteStep: string
    deleteOption: string
    stepBadge: string
    validTitle: string
    errorsTitle: string
    warningsTitle: string
    previewTitle: string
    previewEmpty: string
    activeLabel: string
    enteredBranch: string
    testSend: string
    testSending: string
    testSent: string
    testFailed: string
    testNeedsLink: string
    testNeedsOwnBot: string
    testLinkBtn: string
    testLinkHint: string
  }

  campaigns: {
    newBtn: string
    importBtn: string
    countLabel: string
    searchPlaceholder: string
    filterAll: string
    filterActive: string
    filterPaused: string
    emptyTitle: string
    emptyDesc: string
    emptyBtn: string
    noResults: string
    statusActive: string
    statusPaused: string
    pendingReel: string
    twoLinks: string
    sendCount: string
    duplicate: string
    delete: string
    deleteConfirm: string
    openOnInstagram: string
    close: string
    playReel: string
    campaignReel: string
    campaignPost: string
  }

  common: {
    help: string
  }

  campaignBuilder: {
    nameLabel: string
    nameLabelOptional: string
    namePlaceholder: string
    accountLabel: string
    sectionWhen: string
    triggerSpecific: string
    triggerAny: string
    triggerNext: string
    sectionAnd: string
    matchSpecific: string
    keywordPlaceholder: string
    keywordHint: string
    matchAny: string
    publicReplyLabel: string
    publicReplyPlaceholder: string
    addReply: string
    replyRotateHint: string
    sectionTheyReceive: string
    openingDmLabel: string
    openingDmPlaceholder: string
    openingDmButtonPlaceholder: string
    followGateLabel: string
    followPromptPlaceholder: string
    followButtonPlaceholder: string
    followHint: string
    sectionAndTheyReceive: string
    dmWithLinkLabel: string
    dmPlaceholder: string
    addLink: string
    addSecondLink: string
    linkButtonPlaceholder: string
    secondButtonPlaceholder: string
    tokenHint: string
    previewLabel: string
    untitled: string
    statusActive: string
    statusPaused: string
    newLabel: string
    skip: string
    skipAndFinish: string
    pause: string
    launch: string
    saving: string
    saveChanges: string
    importProgress: string
    importHint: string
    defaultLinkBtn: string
    telegramTitle: string
    telegramToggleLabel: string
    telegramToggleHint: string
    telegramBotRequired: string
    telegramFlowLabel: string
    telegramNoFlowSelected: string
    telegramNoFlows: string
    telegramFlowBroken: string
    telegramLinkLabel: string
    telegramLinkHint: string
    telegramLinkPending: string
    telegramCopy: string
    defaultFollowBtn: string
    defaultOpeningBtn: string
    defaultCampaignName: string
    errNoAccount: string
    errNoPost: string
    errNoKeyword: string
    errNoDm: string
    errNoOpeningDm: string
    comingSoon: string
    requiresAppReview: string
    errSaveFailed: string
    notFound: string
    backToCampaigns: string
    // campaign-preview fallbacks (shown when fields are empty)
    previewOpeningDmFallback: string
    previewButtonFallback: string
    // post-picker strings
    postPickerSearch: string
    postPickerNoImage: string
    postPickerSelected: string
    postPickerUsed: string
    postPickerUsedBy: string
    postPickerNoResults: string
    postPickerNoPosts: string
    postPickerErrLoad: string
    postPickerErrConnect: string
  }

  /** DM delivery statuses. Shared — StatusBadge, the logs filters, diagnostics. */
  dmStatus: {
    sent: string
    failed: string
    pending: string
    dedup: string
    rateLimit: string
    planLimit: string
    noMatch: string
  }

  inbox: {
    title: string
    conversations: string
    loading: string
    noConversations: string
    noMessages: string
    selectConversation: string
    back: string
    backAria: string
    unknownUser: string
    youPrefix: string
    noText: string
    composerPlaceholder: string
    send: string
    sending: string
    errLoadConversations: string
    errSend: string
  }

  campaignDetail: {
    active: string
    paused: string
    triggerAnyPost: string
    triggerNextReel: string
    triggerSpecificPost: string
    anyComment: string
    noKeywords: string
    statSent: string
    statClicks: string
    statCtr: string
    statFailed: string
    whenSomeoneComments: string
    postBadgeAny: string
    postBadgePost: string
    andCommentContains: string
    theyGetOpeningDm: string
    openingMessageFallback: string
    buttonFallback: string
    mustFollowFirst: string
    followPromptFallback: string
    followButtonFallback: string
    andTheyGetDm: string
    openLinkFallback: string
    tabInsights: string
    tabPreview: string
    edit: string
    pause: string
    resume: string
    sampleComment: string
    notFound: string
    breadcrumb: string
    publicReplyUnderPost: string
  }

  importCampaigns: {
    title: string
    descIntro: string
    descRequired: string
    descOptional: string
    descKeywords: string
    descLink: string
    accountLabel: string
    accountShort: string
    fillSample: string
    submit: string
    cancel: string
    errNoCsv: string
    errRowMissing: string
    errStorage: string
  }

  diagnostics: {
    heading: string
    subtitle: string
    refresh: string
    resubscribe: string
    resubscribing: string
    resubscribeNoAccounts: string
    resubscribeFailed: string
    workerStatus: string
    workerHealthy: string
    workerAttention: string
    noHeartbeat: string
    heartbeatAge: string
    queue: string
    workerAlerts: string
    noWorkerAlerts: string
    dmFailures: string
    noDmFailures: string
    webhookFailures: string
    noWebhookFailures: string
    unknownError: string
    tokenFailures: string
    noTokenFailures: string
    events: string
    noEvents: string
  }

  settings: {
    igHeading: string
    statusLabel: string
    statusHelp: string
    connected: string
    notConnected: string
    accountsLabel: string
    accountsHelp: string
    accountsCount: string
    none: string
    connectPrompt: string
    tokenExpires: string
    tokenUnknown: string
    webhookReady: string
    webhookPending: string
    disconnect: string
    disconnecting: string
    disconnectConfirm: string
    connect: string
    connectAnother: string
    teamHeading: string
    unknownMember: string
    pendingInvites: string
    copy: string
    cancel: string
    invitePlaceholder: string
    roleMember: string
    roleAdmin: string
    sendInvite: string
    sending: string
    inviteFailed: string
    usageHeading: string
    dmsThisMonth: string
    currentPeriod: string
    igConnected: string
    igErrDenied: string
    igErrInvalid: string
    igErrAlreadyConnected: string
    igErrFailed: string
    planLabel: string
    upgrade: string
    unlimited: string
    contactsLabel: string
  }

  /** Instagram insight metrics. Used as both stat-card and column labels. */
  metrics: {
    views: string
    reach: string
    likes: string
    comments: string
    saved: string
    shares: string
  }

  overview: {
    show: string
    lastN: string
    countAll: string
    rangeAll: string
    rangeRecent: string
    postsSummary: string
    truncatedSuffix: string
    insightsTitle: string
    insightsBody: string
    reconnect: string
    connect: string
    errLoad: string
    postsHeading: string
    noPosts: string
    colPost: string
    colDate: string
  }

  logs: {
    filterAll: string
    colCommenter: string
    colComment: string
    colCampaign: string
    colAccount: string
    colStatus: string
    colTime: string
    empty: string
    prev: string
    next: string
  }
}
