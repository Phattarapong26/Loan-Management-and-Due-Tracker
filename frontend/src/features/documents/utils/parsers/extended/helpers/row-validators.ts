/**
 * Row validation and classification utilities
 */

/**
 * Check if a row is a column header
 */
export function isColumnHeader(rowText: string, keywords: string[]): boolean {
  const lower = rowText.toLowerCase();
  return keywords.every(keyword => lower.includes(keyword));
}

/**
 * Check if a row is a summary/total row
 */
export function isSummaryRow(rowText: string): boolean {
  const lower = rowText.toLowerCase();
  return (
    lower.includes('รวม') ||
    lower.includes('total') ||
    lower.includes('เฉลี่ย') ||
    lower.includes('average')
  );
}

/**
 * Check if a row is a section header
 */
export function isSectionHeader(rowText: string, keywords: string[]): boolean {
  const lower = rowText.toLowerCase();
  return keywords.some(keyword => lower.includes(keyword));
}

/**
 * Check if row should be skipped
 */
export function shouldSkipRow(rowText: string, skipPatterns: string[]): boolean {
  const lower = rowText.toLowerCase();
  return skipPatterns.some(pattern => lower.includes(pattern));
}

/**
 * Find section boundaries in data
 */
export function findSectionBoundaries(
  data: Array<Array<unknown>>,
  sectionKeywords: string[]
): Array<{ startRow: number; endRow: number }> {
  const sections: Array<{ startRow: number; endRow: number }> = [];

  for (let i = 0; i < data.length; i++) {
    const rowText = data[i].join(' ').toLowerCase();

    if (sectionKeywords.some(keyword => rowText.includes(keyword))) {
      sections.push({
        startRow: i,
        endRow: data.length,
      });
    }
  }

  // Update endRow for each section
  for (let s = 0; s < sections.length; s++) {
    const nextStart = s < sections.length - 1 ? sections[s + 1].startRow : data.length;
    sections[s].endRow = nextStart;
  }

  return sections;
}
