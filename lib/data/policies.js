// =============================================================================
// COMPREHENSIVE POLICY KNOWLEDGE BASE
// 18 policies with keyword matching, jurisdiction-aware answers, risk levels
// Each policy has: id, category, keywords[], source, riskLevel,
//   optional escalate, and answer function that takes (emp) and returns HTML
// =============================================================================

import JURISDICTIONS from './jurisdictions';

const POLICIES = [
  // ============ LEAVE & TIME OFF ============
  {
    id: "vacation",
    category: "Leave & Time Off",
    keywords: ["vacation", "pto", "paid time off", "days off", "time off", "annual leave", "how many days", "leave balance"],
    source: "Leave & Time Off Policy",
    riskLevel: "low",
    answer: (emp) => {
      const days = emp.tenure >= 5 ? 25 : emp.tenure >= 2 ? 20 : 15;
      const rate = emp.tenure >= 5 ? '2.08' : emp.tenure >= 2 ? '1.67' : '1.25';
      const st = JURISDICTIONS[emp.state] || JURISDICTIONS["Federal"];
      let extra = '';
      if (emp.state === 'California') extra = '<br><strong>⚖️ CA:</strong> Unused PTO must be paid out. No "use it or lose it."';
      if (emp.state === 'Illinois') extra = '<br><strong>⚖️ IL:</strong> Earned vacation must be paid out (820 ILCS 115/5).';
      if (emp.state === 'Colorado') extra = '<br><strong>⚖️ CO:</strong> PTO payout required upon separation.';
      return `<strong>PTO for ${emp.firstName} ${emp.lastName}:</strong><br><br>
• <strong>Annual PTO:</strong> ${days} days (${days * 8} hours)<br>
• <strong>Balance:</strong> ${emp.ptoBalance} days remaining<br>
• <strong>Accrual:</strong> ${rate} days/month<br>
• <strong>Carryover:</strong> Up to 5 days<br>
• <strong>Submit:</strong> HR portal, 2 weeks lead time${extra}`;
    }
  },
  {
    id: "sick_leave",
    category: "Leave & Time Off",
    keywords: ["sick", "sick leave", "sick day", "ill", "illness", "calling in sick", "medical leave"],
    source: "Leave & Time Off Policy",
    riskLevel: "low",
    answer: (emp) => {
      const st = JURISDICTIONS[emp.state] || JURISDICTIONS["Federal"];
      return `<strong>Sick Leave Policy:</strong><br><br>
<strong>Company:</strong> 10 days (80hrs) paid/year, accrues 1 day/month, max 30 days balance.<br>
<strong>⚖️ ${emp.state || 'Federal'}:</strong> ${st.sickLeave}<br><br>
No doctor's note for ≤3 days. 4+ days requires medical certification.<br>
Covers: personal illness, family care, medical appointments, DV/SA recovery.`;
    }
  },
  {
    id: "parental",
    category: "Leave & Time Off",
    keywords: ["parental", "maternity", "paternity", "baby", "newborn", "pregnancy", "pregnant", "adoption", "parent leave", "family leave"],
    source: "Leave & Time Off Policy",
    riskLevel: "medium",
    answer: (emp) => {
      let stateInfo = '';
      if (emp.state === 'California') stateInfo = '<br><strong>⚖️ CA:</strong> CFRA (12wk unpaid) + PDL (4mo pregnancy) + PFL (8wk partial pay) — can be stacked.';
      if (emp.state === 'New York') stateInfo = '<br><strong>⚖️ NY:</strong> PFL provides 12 weeks at 67% avg weekly wage.';
      if (emp.state === 'New Jersey') stateInfo = '<br><strong>⚖️ NJ:</strong> NJFLA (12wk) + TDI for pregnancy/recovery.';
      return `<strong>Parental Leave:</strong><br><br>
• <strong>Primary Caregivers:</strong> 16 weeks fully paid<br>
• <strong>Secondary Caregivers:</strong> 6 weeks fully paid<br>
• Birth, adoption, or foster placement<br>
• Continuous or intermittent within 12 months<br><br>
<strong>⚖️ Federal FMLA:</strong> 12 weeks unpaid, job-protected (50+ employees)${stateInfo}<br><br>
Benefits continue during leave. Same/equivalent position guaranteed.`;
    }
  },
  {
    id: "fmla",
    category: "Leave & Time Off",
    keywords: ["fmla", "family medical leave", "medical leave", "serious health"],
    source: "FMLA & Medical Leave Policy",
    riskLevel: "medium",
    answer: (emp) => {
      let stateInfo = '';
      if (emp.state === 'California') stateInfo = '<br><strong>⚖️ CA:</strong> CFRA (12wk, covers domestic partners) + PDL (4mo pregnancy).';
      if (emp.state === 'New York') stateInfo = '<br><strong>⚖️ NY:</strong> PFL 12 weeks paid at 67% avg weekly wage (capped).';
      return `<strong>FMLA & Medical Leave:</strong><br><br>
<strong>Eligibility:</strong> 12 months + 1,250 hours | <strong>Your status:</strong> ${emp.tenure >= 1 ? 'Eligible' : 'Not yet eligible'}<br>
<strong>Entitlement:</strong> 12 weeks unpaid, job-protected per 12-month period<br>
Qualifying: serious health condition (you/family), birth/adoption, military caregiver${stateInfo}<br><br>
Health benefits continue. Contact leaves@company.com to initiate.`;
    }
  },
  {
    id: "holidays",
    category: "Leave & Time Off",
    keywords: ["holiday", "holidays", "company holiday", "office closed", "day off"],
    source: "Holiday Schedule Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>2026 Company Holidays (11 days):</strong><br><br>
Jan 1 New Year's | Jan 19 MLK | Feb 16 Presidents' | May 25 Memorial<br>
Jun 19 Juneteenth | Jul 3 Independence | Sep 7 Labor Day<br>
Nov 26–27 Thanksgiving | Dec 24–25 Christmas<br><br>
+1 Floating Holiday | Winter Break Dec 26–31 (not charged PTO)`
  },

  // ============ BENEFITS ============
  {
    id: "401k",
    category: "Benefits",
    keywords: ["401k", "401(k)", "retirement", "match", "matching", "pension", "vesting"],
    source: "Benefits & Compensation Policy",
    riskLevel: "low",
    answer: (emp) => {
      const vp = Math.min(100, Math.round((emp.tenure / 3) * 100));
      return `<strong>401(k) Retirement Plan:</strong><br><br>
• <strong>Match:</strong> 100% on first 4%, 50% on next 2% = up to 5%<br>
• <strong>Vesting:</strong> 3-year cliff — you're ${vp}% vested (${emp.tenure} yrs)<br>
• Your contributions: always 100% vested<br><br>
<strong>2026 Limits:</strong> $23,500 ($31,000 if 50+) | Total: $70,000<br>
<strong>Options:</strong> Target-date, index funds (S&P 500, Total Market, International), bonds<br>
Changes take effect next pay period.`;
    }
  },
  {
    id: "health",
    category: "Benefits",
    keywords: ["health insurance", "medical", "healthcare", "health plan", "ppo", "hmo", "hdhp", "dental", "vision", "benefits"],
    source: "Benefits & Compensation Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Health Benefits:</strong><br><br>
<strong>Plans:</strong><br>
• PPO — $150/mo | $500 deductible | $3,000 max OOP<br>
• HDHP+HSA — $75/mo | $1,500 deductible | $5,000 max OOP<br>
• HMO — $125/mo | $250 deductible | $2,500 max OOP<br><br>
Company pays 80% of premiums. Dental & Vision: 100% company-paid.<br>
HSA (HDHP): Company seeds $750/yr; 2026 limit $4,300.<br>
Open Enrollment: Nov 1–15. Life events: 30-day special enrollment.`
  },

  // ============ WORKPLACE POLICIES ============
  {
    id: "remote",
    category: "Workplace Policies",
    keywords: ["remote", "work from home", "wfh", "hybrid", "telecommute", "home office", "flexible"],
    source: "Remote Work Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Remote Work Policy:</strong><br><br>
• <strong>Eligible for:</strong> Hybrid (up to 3 days remote/week)<br>
• <strong>Core Hours:</strong> 10AM–3PM local time<br>
• <strong>Home Office:</strong> $500 one-time setup + $50/mo stipend<br>
• <strong>Requirements:</strong> Reliable internet, secure workspace, VPN<br>
Full remote: VP approval + HR review required.`
  },
  {
    id: "expense",
    category: "Workplace Policies",
    keywords: ["expense", "expense report", "reimbursement", "travel", "per diem", "receipt", "mileage"],
    source: "Expense & Travel Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Expense Policy:</strong><br><br>
<strong>Approval:</strong> <$100 none | $100–500 Manager | $500–2K Director | $2K+ VP<br>
<strong>Deadline:</strong> 30 calendar days | Receipts required >$25<br>
<strong>Travel:</strong> Per diem $95/day (B$20/L$25/D$50) | Mileage $0.67/mi<br>
<strong>Submit:</strong> expenses.company.com | Processed within 10 business days.`
  },
  {
    id: "code_of_conduct",
    category: "Workplace Policies",
    keywords: ["code of conduct", "ethics", "gifts", "conflicts of interest", "moonlighting", "social media policy", "confidentiality"],
    source: "Code of Conduct",
    riskLevel: "low",
    answer: (emp) => `<strong>Code of Conduct:</strong><br><br>
• Gifts: max $100 from vendors; report all<br>
• Conflicts: disclose to manager + Legal<br>
• Outside employment: VP written approval; no competitors<br>
• Social media: don't represent company without approval<br>
• Confidentiality: NDA obligations survive employment<br>
Annual acknowledgment required.`
  },

  // ============ WORKPLACE ISSUES ============
  {
    id: "harassment",
    category: "Workplace Issues",
    keywords: ["harassment", "discrimination", "report harassment", "misconduct", "hostile", "bullying", "sexual harassment", "hostile environment", "inappropriate"],
    source: "Code of Conduct & Anti-Harassment Policy",
    riskLevel: "high",
    escalate: "hr",
    answer: (emp) => `<strong>I take this very seriously.</strong><br><br>
Zero tolerance for harassment, discrimination, or retaliation.<br><br>
<strong>Report to:</strong><br>
1. Your manager (if not involved)<br>
2. HR: <strong>hr@company.com</strong> | (555) 123-4567<br>
3. Anonymous Ethics Hotline: <strong>1-800-ETHICS-1</strong><br>
4. Any senior leadership member<br><br>
All reports investigated promptly. Confidentiality maintained. <strong>Retaliation is a fireable offense.</strong>`
  },
  {
    id: "accommodation",
    category: "Workplace Issues",
    keywords: ["accommodation", "ada", "disability", "reasonable accommodation", "accessibility", "ergonomic", "assistive"],
    source: "ADA Accommodation Policy",
    riskLevel: "high",
    escalate: "hr",
    answer: (emp) => `<strong>Reasonable Accommodation (ADA):</strong><br><br>
1. Contact <strong>accommodations@company.com</strong><br>
2. Interactive process initiated with you<br>
3. Medical documentation (kept confidential)<br>
4. Accommodation implemented 5–10 business days<br><br>
Examples: modified schedule, ergonomic equipment, remote work, assistive tech, service animals.<br>
Your request is confidential and stored separately from personnel file.`
  },

  // ============ EMPLOYMENT STATUS ============
  {
    id: "termination",
    category: "Employment Status",
    keywords: ["fired", "terminated", "let go", "laid off", "severance", "resign", "quit", "notice period", "two weeks"],
    source: "Employment Status & Separation Policy",
    riskLevel: "high",
    escalate: "hr",
    answer: (emp) => {
      const st = JURISDICTIONS[emp.state] || JURISDICTIONS["Federal"];
      return `<strong>Separation & Offboarding:</strong><br><br>
<strong>Voluntary:</strong> 2-week notice requested. Exit interview offered.<br>
<strong>Final Pay:</strong> ${st.finalPay}<br>
<strong>PTO Payout:</strong> ${st.ptoPayout}<br>
<strong>Benefits:</strong> Continue through end of month. COBRA: 18 months.<br>
<strong>Severance:</strong> Case-by-case for involuntary separations.<br><br>
Contact your HR Business Partner for specifics.`;
    }
  },

  // ============ COMPLIANCE & LEGAL ============
  {
    id: "legal_action",
    category: "Compliance & Legal",
    keywords: ["lawsuit", "sue", "attorney", "lawyer", "legal action", "eeoc", "discrimination claim", "wrongful", "whistleblower", "osha"],
    source: "Legal Escalation Protocol",
    riskLevel: "critical",
    escalate: "legal",
    answer: (emp) => `<strong>I understand this is serious.</strong><br><br>
🔴 <strong>Flagged for immediate HR + Legal attention.</strong><br><br>
• Senior HR rep will contact you within <strong>24 hours</strong><br>
• Handled with utmost <strong>confidentiality</strong><br>
• <strong>Retaliation strictly prohibited</strong><br><br>
Your rights: file with EEOC/state labor board, consult your own attorney.<br>
<strong>HR Director:</strong> hrdirector@company.com | (555) 123-4567`
  },

  // ============ CAREER & DEVELOPMENT ============
  {
    id: "performance",
    category: "Career & Development",
    keywords: ["performance", "review", "evaluation", "rating", "feedback", "promotion", "raise", "merit", "pip"],
    source: "Performance Management Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Performance Review Process:</strong><br><br>
<strong>Next Cycle:</strong> January 2026<br>
1. Self-assessment: Dec 1–15<br>
2. Manager review: Dec 15–Jan 5<br>
3. Calibration: Jan 6–10<br>
4. Delivery: Jan 15–31<br><br>
<strong>Ratings:</strong> 5=6–10% merit | 4=4–6% | 3=2–4% | 2=PIP consideration | 1=PIP required<br>
<strong>Promotion:</strong> 12 months in role + meets/exceeds + manager nomination.`
  },

  // ============ COMPENSATION ============
  {
    id: "referral",
    category: "Compensation",
    keywords: ["referral", "refer", "bonus", "recruit", "candidate", "referral bonus"],
    source: "Employee Referral Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Employee Referral Program:</strong><br><br>
IC1–3: $2,500 | IC4–5: $4,000 | Manager: $5,000 | Director+: $7,500<br>
<strong>Multipliers:</strong> Engineering +50% | Diversity +$1,000<br>
<strong>Payment:</strong> 50% at hire (30 days) + 50% at 90 days<br>
Submit at referrals.company.com. Unlimited referrals.`
  },
  {
    id: "pay_transparency",
    category: "Compensation",
    keywords: ["pay transparency", "salary range", "compensation range", "pay equity", "pay band", "salary band", "pay gap"],
    source: "Compensation & Pay Transparency Policy",
    riskLevel: "medium",
    answer: (emp) => {
      const st = JURISDICTIONS[emp.state] || JURISDICTIONS["Federal"];
      return `<strong>Pay Transparency & Equity:</strong><br><br>
All postings include salary ranges. Pay bands reviewed annually.<br>
Employees may discuss compensation freely (NLRA protected).<br>
<strong>⚖️ ${emp.state || 'Federal'}:</strong> ${st.payTransparency}<br><br>
Contact your HRBP or compensation@company.com for your pay band.`;
    }
  },
  {
    id: "equity_comp",
    category: "Compensation",
    keywords: ["equity", "stock", "rsu", "options", "vesting", "shares", "iso", "nso"],
    source: "Equity & Stock Compensation Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Equity Compensation:</strong><br><br>
• RSUs: Standard for eligible employees. 4-year vest, 1-year cliff.<br>
• 25% at 1 year, monthly thereafter.<br>
• Annual refresh grants based on performance/level.<br>
Check Carta dashboard or contact equity@company.com.`
  },

  // ============ GENERAL INFORMATION ============
  {
    id: "onboarding",
    category: "General Information",
    keywords: ["onboarding", "new hire", "first day", "orientation", "new employee", "i9", "w4", "equipment"],
    source: "Onboarding & New Hire Policy",
    riskLevel: "low",
    answer: (emp) => `<strong>Onboarding Checklist:</strong><br><br>
<strong>Day 1:</strong> I-9, W-4, direct deposit, benefits enrollment (30-day window), IT setup<br>
<strong>Week 1:</strong> Orientation, team intros, systems training, manager 1:1<br>
<strong>30 Days:</strong> Compliance training, 30/60/90 goals, cross-functional meets<br>
Contact onboarding@company.com.`
  }
];

export default POLICIES;
