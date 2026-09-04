import { displayResultSummary, displayCutDetails, initUI } from '../scripts/ui.js';
import { calculateOptimalCut } from '../scripts/logic.js';

// Setup minimal fake DOM
const fakeElements = {
  summary: { innerHTML: '', style: {} },
  costs: { innerHTML: '', style: {} },
  resultSection: { style: {} },
  detailsList: {
    innerHTML: '',
    appendChild(child) {
      this.children.push(child);
    },
    children: []
  },
  detailsSection: { style: {} }
};

// Override document createElement
globalThis.document = {
  createElement(tag) {
    return {
      tag,
      className: '',
      innerHTML: '',
      title: '',
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
      }
    };
  }
};

initUI(fakeElements);

const outcome = calculateOptimalCut({
  materialLength: 1820,
  unitPrice: 598,
  cutPrice: 50,
  bladeWidth: 3,
  partsListRaw: [320, 244, 470, 470, 470, 470, 320, 244, 470, 470, 470, 470]
});

displayResultSummary(outcome.result);
displayCutDetails(outcome.result);

console.log('--- Summary HTML ---');
console.log(fakeElements.summary.innerHTML);

const hasScrapTextInSummary = fakeElements.summary.innerHTML.includes('最長端材');
console.log('Summary includes "最長端材":', hasScrapTextInSummary);

let hasScrapBadgeInDetails = false;
fakeElements.detailsList.children.forEach((li, idx) => {
  console.log(`--- Detail #${idx + 1} HTML ---`);
  console.log(li.children[0].innerHTML);
  if (li.children[0].innerHTML.includes('最長端材')) {
    hasScrapBadgeInDetails = true;
  }
});

console.log('Details include "最長端材":', hasScrapBadgeInDetails);

if (!hasScrapTextInSummary && !hasScrapBadgeInDetails) {
  console.log('✅ PASS: "最長端材 (再利用推奨)" is completely removed from both summary and details!');
} else {
  console.error('❌ FAIL: String still exists!');
  process.exit(1);
}
