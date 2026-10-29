
/* ApplyTrack research autofill extension.
   Load after app.js and research.js.
   Uses only the official-source evidence already retrieved.
*/
(() => {
  "use strict";

  const form = document.getElementById("college-form");
  const apply = document.getElementById("research-apply");
  if (!form || !apply) return;

  const normalize = value =>
    String(value || "").replace(/\s+/g, " ").trim();

  const unique = values => [...new Set(values)];
  const pad = number => String(number).padStart(2, "0");

  const months = {
    jan: 1, feb: 2, mar: 3, apr: 4,
    may: 5, jun: 6, jul: 7, aug: 8,
    sep: 9, oct: 10, nov: 11, dec: 12
  };

  const rounds = [
    ["Early decision II", /\b(?:early decision\s*(?:ii|2)|ed\s*(?:ii|2))\b/i],
    ["Early decision I", /\b(?:early decision\s*(?:i|1)|ed\s*(?:i|1))\b/i],
    ["Restrictive early action", /\b(?:restrictive early action|single.choice early action|scea|rea)\b/i],
    ["Early action", /\b(?:early action|\bea\b)\b/i],
    ["Early decision", /\b(?:early decision|\bed\b)\b/i],
    ["Regular decision", /\b(?:regular decision|\brd\b)\b/i],
    ["Rolling admission", /\brolling (?:admissions?|applications?)\b/i],
    ["Priority/scholarship", /\b(?:priority|scholarship|merit)\b/i],
    ["Financial aid", /\b(?:financial aid|css profile|fafsa)\b/i]
  ];

  function extractDates(text) {
    const found = [];

    const numeric =
      /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/g;

    const monthFirst =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+(20\d{2})\b/gi;

    const dayFirst =
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/gi;

    for (const match of text.matchAll(numeric)) {
      found.push(
        `${match[1]}-${pad(match[2])}-${pad(match[3])}`
      );
    }

    for (const match of text.matchAll(monthFirst)) {
      const month = months[match[1].slice(0, 3).toLowerCase()];
      found.push(`${match[3]}-${pad(month)}-${pad(match[2])}`);
    }

    for (const match of text.matchAll(dayFirst)) {
      const month = months[match[2].slice(0, 3).toLowerCase()];
      found.push(`${match[3]}-${pad(month)}-${pad(match[1])}`);
    }

    return unique(found).filter(date => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const parsed = new Date(date + "T12:00:00Z");
      return !isNaN(parsed) &&
        parsed.toISOString().slice(0, 10) === date;
    });
  }

  function identifyRound(item) {
    const text = normalize([item.section, item.quote].join(" "));

    const matches = rounds
      .filter(([, pattern]) => pattern.test(text))
      .map(([name]) => name);

    const special = matches.find(name =>
      name === "Early decision I" ||
      name === "Early decision II"
    );

    if (special) return special;

    if (matches.includes("Restrictive early action")) {
      return "Restrictive early action";
    }

    return matches.length === 1 ? matches[0] : null;
  }

  function findDeadlines(report) {
    const matches = [];

    for (const item of report.deadlines || []) {
      const round = identifyRound(item);
      const dates = extractDates(item.quote);

      // Do not assign a date unless its admission round
      // and explicit year are identifiable.
      if (round && dates.length === 1) {
        matches.push({
          round,
          date: dates[0],
          url: item.url
        });
      }
    }

    const grouped = new Map();

    for (const match of matches) {
      if (!grouped.has(match.round)) {
        grouped.set(match.round, []);
      }
      grouped.get(match.round).push(match);
    }

    const confirmed = [];

    for (const [round, values] of grouped) {
      const dates = unique(values.map(value => value.date));

      // Conflicting dates are not autofilled.
      if (dates.length === 1) {
        confirmed.push({
          round,
          date: dates[0],
          url: values[0].url
        });
      }
    }

    return confirmed;
  }

  function findApplicationFee(report) {
    const candidates = [];

    for (const item of report.fees || []) {
      const text = normalize(item.quote);

      if (!/application fee|fee to apply|application costs?/i.test(text)) {
        continue;
      }

      if (/tuition|enrollment deposit|housing deposit/i.test(text)) {
        continue;
      }

      const pattern =
        /(?:application fee|fee to apply|application costs?)(?:.{0,75}?)\$\s*(\d{1,3}(?:\.\d{2})?)/gi;

      for (const match of text.matchAll(pattern)) {
        candidates.push(Number(match[1]));
      }
    }

    const amounts = unique(candidates);

    // Only one consistent fee may be filled.
    return amounts.length === 1 ? amounts[0] : null;
  }

  function hasFeeWaiverEvidence(report) {
    return (report.fees || []).some(item => {
      const text = normalize(item.quote);

      const mentionsWaiver =
        /fee waiver|waiv(?:e|er|ing).{0,30}(?:application )?fee/i.test(text);

      const explicitlyUnavailable =
        /no fee waivers?|fee waivers? (?:are|is) not available|not eligible for (?:a )?fee waiver/i.test(text);

      return mentionsWaiver && !explicitlyUnavailable;
    });
  }

  function collectEvidence(report) {
    const deadlines = findDeadlines(report);
    const fee = findApplicationFee(report);
    const waiver = hasFeeWaiverEvidence(report);

    const entries = [
      "ApplyTrack fee/deadline research (verify admission year, applicant type and official pages):",
      ...deadlines.map(item =>
        `${item.round}: ${item.date} — ${item.url}`
      ),
      ...(fee === null ? [] : [
        `Application fee: $${fee} (official-source excerpt; verify applicability)`
      ]),
      ...(waiver ? [
        "Fee waiver mentioned on official source — verify international eligibility and conditions"
      ] : [])
    ];

    return {
      deadlines,
      fee,
      waiver,
      note: entries.length > 1 ? entries.join("\n") : ""
    };
  }

  function applyAutofill(report) {
    if (!report || !Array.isArray(report.pages) || !report.pages.length) {
      return;
    }

    const result = collectEvidence(report);

    // Application fee
    if (
      result.fee !== null &&
      form.elements.fee.value.trim() === ""
    ) {
      form.elements.fee.value = String(result.fee);
    }

    // Fee waiver
    const waiver = form.elements.waiver;

    if (
      !form.elements.id.value &&
      ["Not needed", "Unknown"].includes(waiver.value) &&
      !waiver.dataset.userTouched
    ) {
      if (![...waiver.options].some(option => option.value === "Unknown")) {
        waiver.add(new Option("Unknown", "Unknown"), 0);
      }

      waiver.value = result.waiver ? "To request" : "Unknown";
    }

    // Current admission-round deadline
    const selectedRound = form.elements.round.value;

    const matchingDeadline = result.deadlines.find(item =>
      item.round.toLowerCase() === selectedRound.toLowerCase() ||
      (
        selectedRound === "Early action" &&
        item.round === "Restrictive early action"
      ) ||
      (
        selectedRound === "Early decision" &&
        item.round === "Early decision I"
      )
    );

    if (
      matchingDeadline &&
      !form.elements.deadline.value
    ) {
      form.elements.deadline.value = matchingDeadline.date;
    }

    // Preserve other researched deadlines and sources.
    const notes = form.elements.notes;

    if (
      result.note &&
      !notes.value.includes("ApplyTrack fee/deadline research (")
    ) {
      const combined = [
        notes.value.trim(),
        result.note
      ].filter(Boolean).join("\n\n");

      if (combined.length <= 5000) {
        notes.value = combined;
      }
    }

    const summary = [
      result.fee === null
        ? "fee not established"
        : "fee suggestion added",
      result.deadlines.length
        ? `${result.deadlines.length} dated round(s) recorded`
        : "no dated rounds established",
      "check official year and fee-waiver eligibility"
    ].join("; ");

    if (typeof announce === "function") {
      announce("Research transferred: " + summary + ".");
    }
  }

  // Preserve fee-waiver changes made manually.
  form.elements.waiver.addEventListener("change", () => {
    form.elements.waiver.dataset.userTouched = "1";
  });

  // research.js transfers documents and notes first.
  // This listener then transfers fee and deadline evidence.
  apply.addEventListener("click", () => {
    if (typeof researchReport !== "undefined") {
      applyAutofill(researchReport);
    }
  });
})();
