// =============================================================================
// JURISDICTION LAW DATABASE
// State-by-state employment-law facts used for policy answers and the LLM
// context. Covers Federal + 11 states.
//
// EVERY fact carries provenance (see lib/law/provenance.js):
//   value, jurisdiction, sourceUrl, effectiveDate, lastVerified, confidence,
//   verification ("verified" | "unverified"), note.
//
// "verified" means the value was checked against the primary source in
// sourceUrl on lastVerified. "unverified" facts keep their old text for the
// verification backlog only; the UI shows "Verify with counsel / source
// pending" and the LLM is told not to state them. Do not flip a fact to
// verified without a primary source (DOL, EEOC, state labor department,
// statute site). Backlog: `npm run law:freshness` and the weekly
// law-freshness issue.
// =============================================================================

// -- Date of the last verification pass (official-domain search) --
const CHECKED = "2026-09-24";

function facts(jurisdiction) {
  return {
    verified: (value, sourceUrl, { effectiveDate = null, confidence = "high", note = null } = {}) => ({
      value,
      jurisdiction,
      sourceUrl,
      effectiveDate,
      lastVerified: CHECKED,
      confidence,
      verification: "verified",
      note,
    }),
    unverified: (value, note = "No primary source checked yet.") => ({
      value,
      jurisdiction,
      sourceUrl: null,
      effectiveDate: null,
      lastVerified: null,
      confidence: "low",
      verification: "unverified",
      note,
    }),
  };
}

const US = facts("Federal");
const CA = facts("California");
const NY = facts("New York");
const TX = facts("Texas");
const IL = facts("Illinois");
const CO = facts("Colorado");
const WA = facts("Washington");
const MA = facts("Massachusetts");
const NJ = facts("New Jersey");
const FL = facts("Florida");
const GA = facts("Georgia");
const PA = facts("Pennsylvania");

const JURISDICTIONS = {
  "Federal": {
    flag: "🇺🇸",
    finalPay: US.verified(
      "No federal deadline for the final paycheck; state law governs",
      "https://www.dol.gov/general/topic/wages/lastpaycheck"
    ),
    ptoPayout: US.verified(
      "Not federally required (FLSA does not require paid vacation)",
      "https://www.dol.gov/general/topic/workhours/vacation_leave"
    ),
    mealBreaks: US.verified(
      "No federal meal or rest break requirement (FLSA)",
      "https://www.dol.gov/general/topic/workhours/breaks"
    ),
    sickLeave: US.verified(
      "No federal paid sick leave mandate for private employers (FMLA leave is unpaid)",
      "https://www.dol.gov/agencies/whd/flsa/faq"
    ),
    payTransparency: US.unverified("Not required"),
    nonCompete: US.verified(
      "No federal ban: the FTC noncompete rule was vacated and the FTC acceded to the vacatur on Sept 5, 2025; state law governs",
      "https://www.ftc.gov/news-events/news/press-releases/2025/09/federal-trade-commission-files-accede-vacatur-non-compete-clause-rule",
      { effectiveDate: "2025-09-05" }
    ),
    minWage: US.verified(
      "$7.25/hr",
      "https://www.dol.gov/agencies/whd/minimum-wage",
      { effectiveDate: "2009-07-24" }
    ),
    overtimeThreshold: US.verified(
      "$684/week ($35,568/yr) salary level for the white-collar exemption; the 2024 rule was vacated on Nov 15, 2024",
      "https://www.dol.gov/agencies/whd/overtime/rulemaking"
    ),
    atWill: US.unverified("Default in most states"),
    fmla: US.verified(
      "Up to 12 weeks unpaid, job-protected leave; employers with 50+ employees; employee needs 12 months, 1,250 hours, and 50 employees within 75 miles",
      "https://www.dol.gov/agencies/whd/fmla"
    ),
    cobra: US.verified(
      "18 months of continuation coverage after termination or reduced hours (can extend to 29 or 36)",
      "https://www.dol.gov/agencies/ebsa/about-ebsa/our-activities/resource-center/faqs/cobra-continuation-health-coverage-workers"
    ),
    retirementDeferralLimit: US.verified(
      "401(k) employee deferral $24,500 ($32,500 if age 50+; $11,250 catch-up at ages 60-63)",
      "https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500",
      { effectiveDate: "2026-01-01" }
    ),
  },
  "California": {
    flag: "🏴",
    finalPay: CA.verified(
      "Discharged: immediately. Quit without notice: within 72 hours. Quit with 72+ hours' notice: on the last day",
      "https://www.dir.ca.gov/dlse/faq_paydays.htm"
    ),
    ptoPayout: CA.verified(
      "Required: vested vacation is wages and cannot be forfeited (Labor Code §227.3); no \"use it or lose it\"",
      "https://www.dir.ca.gov/dlse/faq_vacation.htm"
    ),
    mealBreaks: CA.verified(
      "30-min meal when working more than 5 hrs; paid 10-min rest per 4 hrs (or major fraction)",
      "https://www.dir.ca.gov/dlse/FAQ_mealperiods.htm"
    ),
    sickLeave: CA.verified(
      "At least 40 hours or 5 days of paid sick leave per year (SB 616)",
      "https://dir.ca.gov/dlse/paid_sick_leave.htm",
      { effectiveDate: "2024-01-01" }
    ),
    payTransparency: CA.verified(
      "Pay scale required in job postings for employers with 15+ employees (Labor Code §432.3)",
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=432.3"
    ),
    nonCompete: CA.verified(
      "Void and unlawful to require (Bus. & Prof. Code §16600, §16600.5; SB 699 / AB 1076)",
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=16600",
      { effectiveDate: "2024-01-01" }
    ),
    minWage: CA.verified(
      "$16.90/hr for all employers (higher for fast food and healthcare)",
      "https://dir.ca.gov/dlse/minimum_wage.htm",
      { effectiveDate: "2026-01-01" }
    ),
    overtimeThreshold: CA.verified(
      "$70,304/yr for exempt employees (2x state minimum wage)",
      "https://dir.ca.gov/DIRNews/2025/2025-118.html",
      { effectiveDate: "2026-01-01" }
    ),
    atWill: CA.unverified("Yes, strong public policy exceptions"),
    calWARN: CA.verified(
      "60-day notice; covered establishments with 75+ employees; mass layoff = 50+ employees in 30 days",
      "https://edd.ca.gov/en/jobs_and_training/Layoff_Services_WARN/"
    ),
    cfra: CA.verified(
      "Up to 12 workweeks job-protected leave; employers with 5+ employees; employee needs 12 months and 1,250 hours",
      "https://calcivilrights.ca.gov/wp-content/uploads/sites/32/2023/01/CFRA-and-Pregnancy-Leave_ENG.pdf"
    ),
    pfl: CA.verified(
      "Paid Family Leave: up to 8 weeks of partial wage replacement (about 70-90% of wages, capped)",
      "https://edd.ca.gov/paidfamilyleave"
    ),
    pdl: CA.verified(
      "Pregnancy Disability Leave: up to 4 months (employers with 5+ employees)",
      "https://calcivilrights.ca.gov/wp-content/uploads/sites/32/2023/01/CFRA-and-Pregnancy-Leave_ENG.pdf"
    ),
  },
  "New York": {
    flag: "🗽",
    finalPay: NY.verified(
      "By the regular payday for the pay period in which employment ended (Labor Law §191)",
      "https://dol.ny.gov/frequency-pay-faq"
    ),
    ptoPayout: NY.unverified("Not required unless policy states otherwise"),
    mealBreaks: NY.verified(
      "30-min meal between 11am and 2pm for shifts over 6 hrs spanning that period (non-factory); other meal periods apply (Labor Law §162)",
      "https://dol.ny.gov/day-rest-and-meal-periods"
    ),
    sickLeave: NY.verified(
      "Up to 56 hrs paid (100+ employees); up to 40 hrs paid (5-99 employees, or 4 or fewer with net income over $1M); 40 hrs unpaid otherwise",
      "https://www.ny.gov/new-york-paid-sick-leave/new-york-paid-sick-leave"
    ),
    payTransparency: NY.verified(
      "Salary range required in job postings for employers with 4+ employees (Labor Law §194-b)",
      "https://dol.ny.gov/pay-transparency",
      { effectiveDate: "2023-09-17" }
    ),
    nonCompete: NY.unverified("Limited enforceability; pending ban"),
    minWage: NY.verified(
      "$17.00/hr NYC, Long Island and Westchester; $16.00/hr rest of state",
      "https://www.ny.gov/programs/new-york-states-minimum-wage",
      { effectiveDate: "2026-01-01" }
    ),
    overtimeThreshold: NY.unverified(
      "State exempt salary thresholds above the federal level",
      "2026 state exempt salary figures not found on dol.ny.gov during the 2026-09-24 check."
    ),
    atWill: NY.unverified("Yes, standard exceptions"),
    nypfl: NY.verified(
      "Paid Family Leave: up to 12 weeks at 67% of average weekly wage, max $1,228.53/week (2026)",
      "https://paidfamilyleave.ny.gov/2026",
      { effectiveDate: "2026-01-01" }
    ),
  },
  "Texas": {
    flag: "⭐",
    finalPay: TX.verified(
      "Fired: within 6 calendar days. Quit: next regularly scheduled payday",
      "https://efte.twc.texas.gov/final_pay.html"
    ),
    ptoPayout: TX.verified(
      "Not required unless a written policy or agreement promises it",
      "https://efte.twc.texas.gov/accrued_leave_payouts.html"
    ),
    mealBreaks: TX.verified(
      "No state meal or rest break requirement",
      "https://efte.twc.texas.gov/d_breaks.html"
    ),
    sickLeave: TX.verified(
      "No state paid sick leave mandate",
      "https://efte.twc.texas.gov/vacation_and_sick_leave.html",
      { confidence: "medium" }
    ),
    payTransparency: TX.unverified("Not required"),
    nonCompete: TX.unverified("Enforceable if reasonable"),
    minWage: TX.verified(
      "$7.25/hr (Texas adopts the federal minimum wage)",
      "https://www.twc.texas.gov/programs/wage-and-hour/texas-minimum-wage-law"
    ),
    overtimeThreshold: TX.unverified("Follows federal"),
    atWill: TX.unverified("Yes, very employer-friendly"),
  },
  "Illinois": {
    flag: "🏛️",
    finalPay: IL.verified(
      "Next regularly scheduled payday, including earned vacation (820 ILCS 115/5)",
      "https://labor.illinois.gov/faqs/wage-payment-faq.html"
    ),
    ptoPayout: IL.verified(
      "Required: earned vacation must be paid out at separation (820 ILCS 115/5)",
      "https://ilga.gov/legislation/ilcs/fulltext.asp?DocName=082001150K5"
    ),
    mealBreaks: IL.verified(
      "20-min meal for a 7.5-hr shift, starting no later than 5 hrs in (One Day Rest in Seven Act)",
      "https://labor.illinois.gov/faqs/odrisa-faq.html",
      { effectiveDate: "2023-01-01" }
    ),
    sickLeave: IL.verified(
      "Up to 40 hrs paid leave per year for any reason, 1 hr per 40 hrs worked (Paid Leave for All Workers Act)",
      "https://labor.illinois.gov/laws-rules/paidleave.html",
      { effectiveDate: "2024-01-01" }
    ),
    payTransparency: IL.verified(
      "Pay scale and benefits required in job postings for employers with 15+ employees (Equal Pay Act)",
      "https://labor.illinois.gov/laws-rules/conmed/equal-pay-act-salary-transparency.html",
      { effectiveDate: "2025-01-01" }
    ),
    nonCompete: IL.verified(
      "Void for employees earning $75,000/yr or less ($80,000 from Jan 1, 2027); non-solicits void at $45,000 or less (Freedom to Work Act)",
      "https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3737"
    ),
    minWage: IL.verified(
      "$15.00/hr (age 18+)",
      "https://labor.illinois.gov/laws-rules/fls/minimum-wage-law.html",
      { effectiveDate: "2025-01-01" }
    ),
    overtimeThreshold: IL.unverified("Follows federal"),
    atWill: IL.unverified("Yes, standard exceptions"),
  },
  "Colorado": {
    flag: "🏔️",
    finalPay: CO.verified(
      "Employer-initiated separation: immediately. Quit: next regular payday",
      "https://cdle.colorado.gov/sites/cdle/files/colorado_wage_act_revised_august_6,_2025.pdf"
    ),
    ptoPayout: CO.verified(
      "Required: earned vacation must be paid at separation and cannot be forfeited",
      "https://cdle.colorado.gov/sites/cdle/files/INFO%20%233E%20Payment%20of%20Earned%20Vacation%20upon%20Separation%20of%20Employment%205.29.2024%20%5Baccessible%5D.pdf"
    ),
    mealBreaks: CO.verified(
      "30-min meal when a shift exceeds 5 hrs; paid 10-min rest per 4 hrs (COMPS Order)",
      "https://cdle.colorado.gov/dlss-home-page/wage-and-hour-law/breaks-rest-meal-periods"
    ),
    sickLeave: CO.verified(
      "1 hr per 30 hrs worked, up to 48 hrs paid per year (Healthy Families and Workplaces Act)",
      "https://cdle.colorado.gov/dlss/labor-laws-by-topic/wage-and-hour-laws-including-paid-sick-leave"
    ),
    payTransparency: CO.verified(
      "Compensation range and general benefits description required in all job postings (Equal Pay for Equal Work Act)",
      "https://cdle.colorado.gov/dlss/labor-laws-by-topic/equal-pay-for-equal-work-act"
    ),
    nonCompete: CO.verified(
      "Void unless the worker earns at least the highly-compensated threshold ($130,014 in 2026) and other statutory conditions are met",
      "https://cdle.colorado.gov/sites/cdle/files/adopted_2026_pay_calc_order_7_ccr_1103-14_12.8.25.pdf",
      { effectiveDate: "2026-01-01", confidence: "medium", note: "Threshold read from a search summary of the 2026 PAY CALC Order; confirm the non-compete row in the PDF." }
    ),
    minWage: CO.verified(
      "$15.16/hr",
      "https://cdle.colorado.gov/sites/cdle/files/2026_comps_order_poster_english_%5Baccessible%5D.pdf",
      { effectiveDate: "2026-01-01", confidence: "medium" }
    ),
    overtimeThreshold: CO.unverified(
      "Follows federal + COMPS order",
      "2026 COMPS EAP salary could not be confirmed (conflicting figures in search summaries of the 2026 PAY CALC Order)."
    ),
    atWill: CO.unverified("Yes"),
  },
  "Washington": {
    flag: "🌲",
    finalPay: WA.verified(
      "Next regularly scheduled payday, whether the employee quits or is fired",
      "https://lni.wa.gov/workers-rights/wages/getting-paid/"
    ),
    ptoPayout: WA.unverified("Not required unless policy states otherwise"),
    mealBreaks: WA.verified(
      "30-min meal in a shift of 5+ hrs; paid 10-min rest per 4 hrs",
      "https://lni.wa.gov/workers-rights/workplace-policies/rest-breaks-meal-periods-and-schedules"
    ),
    sickLeave: WA.verified(
      "At least 1 hr paid sick leave per 40 hrs worked",
      "https://lni.wa.gov/workers-rights/leave/paid-sick-leave/"
    ),
    payTransparency: WA.verified(
      "Wage scale or salary range and benefits required in job postings for employers with 15+ employees (RCW 49.58)",
      "https://www.lni.wa.gov/workers-rights/wages/equal-pay-opportunities-act/"
    ),
    nonCompete: WA.verified(
      "Void for employees earning below $126,858.83 (2026); a full ban takes effect June 30, 2027",
      "https://www.lni.wa.gov/workers-rights/workplace-policies/non-compete-agreements",
      { effectiveDate: "2026-01-01" }
    ),
    minWage: WA.verified(
      "$17.13/hr",
      "https://lni.wa.gov/news-events/article/25-27",
      { effectiveDate: "2026-01-01" }
    ),
    overtimeThreshold: WA.verified(
      "$1,541.70/week ($80,168.40/yr), 2.25x state minimum wage",
      "https://lni.wa.gov/news-events/article/25-27",
      { effectiveDate: "2026-01-01" }
    ),
    atWill: WA.unverified("Yes"),
  },
  "Massachusetts": {
    flag: "🎓",
    finalPay: MA.verified(
      "Fired: paid in full on the last day. Quit: next regular payday",
      "https://www.mass.gov/info-details/massachusetts-law-about-employment-termination"
    ),
    ptoPayout: MA.verified(
      "Required: earned, unused vacation is wages",
      "https://www.mass.gov/info-details/massachusetts-law-about-vacation-leave"
    ),
    mealBreaks: MA.verified(
      "30-min meal break when working more than 6 hrs",
      "https://www.mass.gov/guides/breaks-and-time-off"
    ),
    sickLeave: MA.verified(
      "1 hr per 30 hrs worked, up to 40 hrs/year; paid for employers with 11+ employees, unpaid for smaller employers",
      "https://www.mass.gov/info-details/earned-sick-time"
    ),
    payTransparency: MA.verified(
      "Pay range required in job postings for employers with 25+ employees",
      "https://www.mass.gov/info-details/pay-transparency-in-massachusetts",
      { effectiveDate: "2025-10-29" }
    ),
    nonCompete: MA.verified(
      "Restricted period max 12 months; requires garden leave (at least 50% of highest base salary in prior 2 years) or other agreed consideration (M.G.L. c.149 §24L)",
      "https://malegislature.gov/Laws/GeneralLaws/Parti/Titlexxi/Chapter149/Section24L",
      { confidence: "medium", note: "\"Other agreed consideration\" alternative not in the search summary; confirm in §24L(b)(vii)." }
    ),
    minWage: MA.verified(
      "$15.00/hr",
      "https://www.mass.gov/info-details/massachusetts-law-about-minimum-wage",
      { effectiveDate: "2023-01-01" }
    ),
    overtimeThreshold: MA.unverified("Follows federal"),
    atWill: MA.unverified("Yes, broad public policy exceptions"),
  },
  "New Jersey": {
    flag: "🏖️",
    finalPay: NJ.verified(
      "By the regular payday for the pay period in which employment ended",
      "https://www.nj.gov/labor/wageandhour/support/faqs/wageandhouremployerfaqs.shtml"
    ),
    ptoPayout: NJ.unverified("Not required unless policy states otherwise"),
    mealBreaks: NJ.verified(
      "No requirement for adults 18+ (minors: 30 min after 5 hrs)",
      "https://www.nj.gov/labor/wageandhour/support/faqs/wageandhouremployerfaqs.shtml"
    ),
    sickLeave: NJ.verified(
      "Up to 40 hrs paid per year, 1 hr per 30 hrs worked, all employers (Earned Sick Leave Law)",
      "https://www.nj.gov/labor/myworkrights/leave-benefits/sick-leave/"
    ),
    payTransparency: NJ.verified(
      "Pay range and benefits required in postings for employers with 10+ employees",
      "https://www.nj.gov/labor/myworkrights/wages/pay-transparency/",
      { effectiveDate: "2025-06-01" }
    ),
    nonCompete: NJ.unverified("Enforceable if reasonable"),
    minWage: NJ.verified(
      "$15.92/hr for most employers ($15.23 seasonal and small employers)",
      "https://www.nj.gov/labor/lwdhome/press/2025/20251001_Minimum_Wage.shtml",
      { effectiveDate: "2026-01-01" }
    ),
    overtimeThreshold: NJ.unverified("Follows federal"),
    atWill: NJ.unverified("Yes"),
    njfla: NJ.verified(
      "Up to 12 weeks job-protected family leave in 24 months; from July 17, 2026 covers employers with 15+ employees and employees with 3+ months of service",
      "https://www.nj.gov/labor/lwdhome/press/2026/20260715_moreprotections.shtml",
      { effectiveDate: "2026-07-17" }
    ),
    tdi: NJ.verified(
      "Temporary Disability Insurance: 85% of average weekly wage, max $1,119/week (2026)",
      "https://www.nj.gov/labor/lwdhome/press/2025/20251229_newbenefitrates2026.shtml",
      { effectiveDate: "2026-01-01" }
    ),
  },
  "Florida": {
    flag: "🌴",
    finalPay: FL.unverified("Next payday"),
    ptoPayout: FL.unverified("Not required"),
    mealBreaks: FL.unverified("No state requirement (minors only)"),
    sickLeave: FL.unverified("No state mandate"),
    payTransparency: FL.unverified("Not required"),
    nonCompete: FL.verified(
      "Generally enforceable; the CHOICE Act allows covered noncompetes of up to 4 years with a mandatory preliminary injunction",
      "https://www.flsenate.gov/Committees/BillSummaries/2025/html/1219",
      { effectiveDate: "2025-07-01" }
    ),
    minWage: FL.verified(
      "$14.00/hr; rises to $15.00/hr on Sept 30, 2026",
      "https://floridajobs.org/florida-minimum-wage",
      { effectiveDate: "2025-09-30", note: "Update value to $15.00/hr after 2026-09-30." }
    ),
    overtimeThreshold: FL.unverified("Follows federal"),
    atWill: FL.unverified("Yes"),
  },
  "Georgia": {
    flag: "🍑",
    finalPay: GA.unverified(
      "Next payday",
      "GA DOL pages checked 2026-09-24 did not state a final-pay deadline."
    ),
    ptoPayout: GA.unverified("Not required"),
    mealBreaks: GA.unverified("No state requirement"),
    sickLeave: GA.verified(
      "No state paid sick leave mandate",
      "https://dol.georgia.gov/faqs-individuals/individuals-faqs-laws-and-regulations",
      { confidence: "medium" }
    ),
    payTransparency: GA.unverified("Not required"),
    nonCompete: GA.unverified("Enforceable if reasonable"),
    minWage: GA.verified(
      "$7.25/hr federal rate applies to FLSA-covered employers (state rate is $5.15)",
      "https://dol.georgia.gov/minimum-wage"
    ),
    overtimeThreshold: GA.unverified("Follows federal"),
    atWill: GA.unverified("Yes"),
  },
  "Pennsylvania": {
    flag: "🔔",
    finalPay: PA.verified(
      "Next regular payday (Wage Payment and Collection Law)",
      "https://www.pa.gov/content/dam/copapwp-pagov/en/dli/documents/individuals/labor-management-relations/llc/documents/llc-2.pdf"
    ),
    ptoPayout: PA.verified(
      "Not required unless expressly promised in a policy or agreement",
      "https://www.pa.gov/services/dli/file-a-wage-payment-and-collection-complaint",
      { confidence: "medium" }
    ),
    mealBreaks: PA.unverified("30min for minors"),
    sickLeave: PA.verified(
      "Philadelphia: 1 hr per 40 hrs, up to 40 hrs/year, paid for employers with 10+ employees",
      "https://www.phila.gov/documents/paid-sick-leave-information/"
    ),
    payTransparency: PA.unverified("Not required statewide"),
    nonCompete: PA.unverified("Enforceable if reasonable"),
    minWage: PA.verified(
      "$7.25/hr",
      "https://www.pa.gov/agencies/dli/resources/compliance-laws-and-regulations/labor-management-relations/pennsylvania-s-minimum-wage-act",
      { confidence: "medium", note: "A $15 bill passed the House in 2026; recheck for enactment." }
    ),
    overtimeThreshold: PA.unverified("Follows federal"),
    atWill: PA.unverified("Yes"),
  }
};

export default JURISDICTIONS;
