export interface ProtectedRange {
  start: number;
  end: number;
}

export interface ProtectedMessageValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
}

/**
 * HTML form submission serialises textarea line endings as CRLF. Internally this
 * component uses LF, so both its browser and server representations are stable.
 */
export function normaliseMessageNewlines(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

export function validateProtectedRanges(
  message: string,
  protectedRanges: ProtectedRange[],
): ProtectedMessageValidationResult {
  let previousEnd = 0;
  for (const range of protectedRanges) {
    if (
      !Number.isSafeInteger(range.start) ||
      !Number.isSafeInteger(range.end) ||
      range.start < previousEnd ||
      range.end < range.start ||
      range.end > message.length
    ) {
      return { valid: false, error: 'The protected message ranges are invalid.' };
    }
    previousEnd = range.end;
  }
  return { valid: true };
}

/**
 * Treat the original message as editable islands separated by ordered immutable
 * segments. This verifies more than mere substring presence: each protected
 * segment must occupy its corresponding place in that sequence.
 */
export function validateEditedMessage(
  originalMessage: string,
  protectedRanges: ProtectedRange[],
  editedMessage: string,
): ProtectedMessageValidationResult {
  const original = normaliseMessageNewlines(originalMessage);
  const edited = normaliseMessageNewlines(editedMessage);
  const rangesResult = validateProtectedRanges(original, protectedRanges);
  if (!rangesResult.valid) return rangesResult;

  let searchFrom = 0;
  for (const range of protectedRanges) {
    const protectedText = original.slice(range.start, range.end);
    const foundAt = edited.indexOf(protectedText, searchFrom);
    if (foundAt === -1) {
      return { valid: false, error: 'Protected content has been changed or removed.' };
    }
    searchFrom = foundAt + protectedText.length;
  }
  return { valid: true, message: edited };
}
