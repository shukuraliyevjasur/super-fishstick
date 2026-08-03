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
    logs: string
    settings: string
    diagnostics: string
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
}
