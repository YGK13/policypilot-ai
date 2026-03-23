// =============================================================================
// JURISDICTION LAW DATABASE
// Deep, state-by-state compliance rules used for policy answers
// Covers all 12 jurisdictions: Federal + 11 states
// =============================================================================

const JURISDICTIONS = {
  "Federal": {
    flag: "🇺🇸",
    finalPay: "Next scheduled payday",
    ptoPayout: "Not federally required",
    mealBreaks: "No federal requirement",
    sickLeave: "No federal mandate (FMLA for qualifying)",
    payTransparency: "Not required",
    nonCompete: "FTC rule pending",
    minWage: "$7.25/hr",
    overtimeThreshold: "$35,568/yr salary",
    atWill: "Default in most states",
    fmla: "12 weeks unpaid, job-protected (50+ employees)"
  },
  "California": {
    flag: "🏴",
    finalPay: "Immediate upon termination; 72hrs if quit",
    ptoPayout: "Required — PTO is earned wages",
    mealBreaks: "30min meal/5hrs; 10min rest/4hrs",
    sickLeave: "Min 5 days (40hrs) paid (2024+)",
    payTransparency: "Required in postings (SB 1162)",
    nonCompete: "Not enforceable (Bus. & Prof. Code §16600)",
    minWage: "$16.00/hr",
    overtimeThreshold: "2x state min wage for exempt ($66,560)",
    atWill: "Yes, strong public policy exceptions",
    calWARN: "60-day notice for mass layoffs (75+)",
    cfra: "12 weeks unpaid leave (5+ employees)",
    pfl: "Paid Family Leave: up to 8 weeks partial pay",
    pdl: "Pregnancy Disability Leave: up to 4 months"
  },
  "New York": {
    flag: "🗽",
    finalPay: "Next scheduled payday",
    ptoPayout: "Not required unless policy states otherwise",
    mealBreaks: "30min meal for 6+ hr shift",
    sickLeave: "Up to 56hrs depending on employer size",
    payTransparency: "Required (NYC + statewide 2023+)",
    nonCompete: "Limited enforceability; pending ban",
    minWage: "$16.00/hr NYC",
    overtimeThreshold: "Follows federal + state adjustments",
    atWill: "Yes, standard exceptions",
    nypfl: "12 weeks, 67% avg weekly wage"
  },
  "Texas": {
    flag: "⭐",
    finalPay: "Within 6 days (fired) or next payday (quit)",
    ptoPayout: "Not required",
    mealBreaks: "No state requirement",
    sickLeave: "No state mandate",
    payTransparency: "Not required",
    nonCompete: "Enforceable if reasonable",
    minWage: "$7.25/hr (federal)",
    overtimeThreshold: "Follows federal",
    atWill: "Yes, very employer-friendly"
  },
  "Illinois": {
    flag: "🏛️",
    finalPay: "Next payday",
    ptoPayout: "Required — must be paid out (820 ILCS 115/5)",
    mealBreaks: "20min meal within first 5hrs",
    sickLeave: "40hrs paid leave/year (2024+)",
    payTransparency: "Required (2025+, SB 3208)",
    nonCompete: "Not for employees <$75K",
    minWage: "$14.00/hr",
    overtimeThreshold: "Follows federal",
    atWill: "Yes, standard exceptions"
  },
  "Colorado": {
    flag: "🏔️",
    finalPay: "Immediate (fired); next payday (quit)",
    ptoPayout: "Required",
    mealBreaks: "30min meal/5hrs; 10min rest/4hrs",
    sickLeave: "48hrs paid/year",
    payTransparency: "Required — compensation in all postings (EPEWA)",
    nonCompete: "Highly restricted; void for most workers",
    minWage: "$14.42/hr",
    overtimeThreshold: "Follows federal + COMPS order",
    atWill: "Yes"
  },
  "Washington": {
    flag: "🌲",
    finalPay: "Next payday",
    ptoPayout: "Not required unless policy states otherwise",
    mealBreaks: "30min meal/5hrs; 10min rest/4hrs",
    sickLeave: "1hr per 40hrs worked (no cap)",
    payTransparency: "Required (SB 5761, 2023+)",
    nonCompete: "Only for employees earning $116K+",
    minWage: "$16.28/hr",
    overtimeThreshold: "Follows federal + state",
    atWill: "Yes"
  },
  "Massachusetts": {
    flag: "🎓",
    finalPay: "Immediate (fired); next payday (quit)",
    ptoPayout: "Required for vacation time",
    mealBreaks: "30min break/6hrs",
    sickLeave: "40hrs paid/year",
    payTransparency: "Required (2025+)",
    nonCompete: "12-month max, garden leave required",
    minWage: "$15.00/hr",
    overtimeThreshold: "Follows federal",
    atWill: "Yes, broad public policy exceptions"
  },
  "New Jersey": {
    flag: "🏖️",
    finalPay: "Next payday",
    ptoPayout: "Not required unless policy states otherwise",
    mealBreaks: "No state requirement",
    sickLeave: "40hrs paid/year (Earned Sick Leave Act)",
    payTransparency: "Required (2025+)",
    nonCompete: "Enforceable if reasonable",
    minWage: "$15.49/hr",
    overtimeThreshold: "Follows federal",
    atWill: "Yes",
    njfla: "12 weeks family leave (30+ employees)",
    tdi: "Temporary Disability Insurance"
  },
  "Florida": {
    flag: "🌴",
    finalPay: "Next payday",
    ptoPayout: "Not required",
    mealBreaks: "No state requirement (minors only)",
    sickLeave: "No state mandate",
    payTransparency: "Not required",
    nonCompete: "Enforceable (strong employer protections)",
    minWage: "$13.00/hr",
    overtimeThreshold: "Follows federal",
    atWill: "Yes"
  },
  "Georgia": {
    flag: "🍑",
    finalPay: "Next payday",
    ptoPayout: "Not required",
    mealBreaks: "No state requirement",
    sickLeave: "No state mandate",
    payTransparency: "Not required",
    nonCompete: "Enforceable if reasonable",
    minWage: "$7.25/hr (federal)",
    overtimeThreshold: "Follows federal",
    atWill: "Yes"
  },
  "Pennsylvania": {
    flag: "🔔",
    finalPay: "Next payday",
    ptoPayout: "Not required unless policy states",
    mealBreaks: "30min for minors",
    sickLeave: "Philadelphia: 40hrs for 10+ employees",
    payTransparency: "Not required statewide",
    nonCompete: "Enforceable if reasonable",
    minWage: "$7.25/hr",
    overtimeThreshold: "Follows federal",
    atWill: "Yes"
  }
};

export default JURISDICTIONS;
