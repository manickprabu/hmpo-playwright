export function normaliseRanges(value, ranges) {
  const sorted = [...(ranges || [])].sort((first, second) => first.start - second.start);
  let end = 0;
  return sorted.map((range) => {
    if (!Number.isInteger(range.start) || !Number.isInteger(range.end) || range.start < end || range.end < range.start || range.end > value.length) {
      throw new Error('Protected message ranges are invalid.');
    }
    end = range.end;
    return { start: range.start, end: range.end };
  });
}

function intersectsProtected(ranges, start, end) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function isInsideProtected(ranges, position) {
  return ranges.some((range) => position > range.start && position < range.end);
}

export function updateProtectedRanges(ranges, editStart, editEnd, insertedLength) {
  const removedLength = editEnd - editStart;
  const difference = insertedLength - removedLength;
  return ranges.map((range) => {
    if (range.start >= editEnd) return { start: range.start + difference, end: range.end + difference };
    return { ...range };
  });
}

export class ProtectedMessageEditor {
  constructor({ textarea, overlay, protectedRanges }) {
    if (!textarea || !overlay) throw new Error('A textarea and overlay are required.');
    this.textarea = textarea;
    this.overlay = overlay;
    this.originalValue = textarea.value.replace(/\r\n?/g, '\n');
    if (textarea.value !== this.originalValue) textarea.value = this.originalValue;
    this.protectedRanges = normaliseRanges(this.originalValue, protectedRanges);
    this.originalRanges = this.protectedRanges.map((range) => ({ ...range }));
    this.lastValid = this.snapshot();
    this.pendingEdit = null;
    this.render();
    this.bind();
  }

  snapshot() {
    return { value: this.textarea.value, ranges: this.protectedRanges.map((range) => ({ ...range })) };
  }

  restore(snapshot = this.lastValid) {
    this.textarea.value = snapshot.value;
    this.protectedRanges = snapshot.ranges.map((range) => ({ ...range }));
    this.textarea.setSelectionRange(Math.min(this.textarea.selectionStart, this.textarea.value.length), Math.min(this.textarea.selectionEnd, this.textarea.value.length));
    this.render();
  }

  isAllowed(start, end) {
    return start === end
      ? !isInsideProtected(this.protectedRanges, start)
      : !intersectsProtected(this.protectedRanges, start, end);
  }

  bind() {
    this.textarea.addEventListener('beforeinput', (event) => this.beforeInput(event));
    this.textarea.addEventListener('input', () => this.onInput());
    this.textarea.addEventListener('scroll', () => this.syncScroll());
    this.textarea.addEventListener('drop', (event) => event.preventDefault());
    this.textarea.addEventListener('reset', () => {});
    this.textarea.form?.addEventListener('reset', () => {
      queueMicrotask(() => {
        this.protectedRanges = this.originalRanges.map((range) => ({ ...range }));
        this.textarea.value = this.originalValue;
        this.lastValid = this.snapshot();
        this.render();
      });
    });
  }

  beforeInput(event) {
    let start = this.textarea.selectionStart;
    let end = this.textarea.selectionEnd;
    if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo' || event.inputType === 'insertFromDrop') {
      event.preventDefault();
      return;
    }
    if (start === end && event.inputType === 'deleteContentBackward' && start > 0) start -= 1;
    if (start === end && event.inputType === 'deleteContentForward') end += 1;
    if (!this.isAllowed(start, end)) {
      event.preventDefault();
      return;
    }
    this.pendingEdit = this.snapshot();
  }

  onInput() {
    const previous = this.pendingEdit || this.lastValid;
    this.pendingEdit = null;
    const nextValue = this.textarea.value.replace(/\r\n?/g, '\n');
    if (nextValue !== this.textarea.value) this.textarea.value = nextValue;
    const oldValue = previous.value;
    let prefix = 0;
    while (prefix < oldValue.length && prefix < nextValue.length && oldValue[prefix] === nextValue[prefix]) prefix += 1;
    let oldSuffix = oldValue.length;
    let newSuffix = nextValue.length;
    while (oldSuffix > prefix && newSuffix > prefix && oldValue[oldSuffix - 1] === nextValue[newSuffix - 1]) { oldSuffix -= 1; newSuffix -= 1; }
    if (!this.isAllowedFor(previous.ranges, prefix, oldSuffix)) {
      this.restore(previous);
      return;
    }
    const ranges = updateProtectedRanges(previous.ranges, prefix, oldSuffix, newSuffix - prefix);
    if (!ranges.every((range, index) => nextValue.slice(range.start, range.end) === oldValue.slice(previous.ranges[index].start, previous.ranges[index].end))) {
      this.restore(previous);
      return;
    }
    this.protectedRanges = ranges;
    this.lastValid = this.snapshot();
    this.render();
  }

  isAllowedFor(ranges, start, end) {
    return start === end ? !isInsideProtected(ranges, start) : !intersectsProtected(ranges, start, end);
  }

  syncScroll() {
    this.overlay.scrollTop = this.textarea.scrollTop;
    this.overlay.scrollLeft = this.textarea.scrollLeft;
  }

  render() {
    this.overlay.replaceChildren();
    let position = 0;
    for (const range of this.protectedRanges) {
      this.overlay.append(document.createTextNode(this.textarea.value.slice(position, range.start)));
      const protectedText = document.createElement('span');
      protectedText.className = 'protected-message-editor__protected';
      protectedText.textContent = this.textarea.value.slice(range.start, range.end);
      this.overlay.append(protectedText);
      position = range.end;
    }
    this.overlay.append(document.createTextNode(this.textarea.value.slice(position)));
    this.syncScroll();
  }
}

export function initialiseProtectedMessageEditors(root = document) {
  root.querySelectorAll('[data-protected-message-editor]').forEach((element) => {
    const textarea = element.querySelector('textarea');
    const overlay = element.querySelector('[data-message-overlay]');
    try {
      new ProtectedMessageEditor({ textarea, overlay, protectedRanges: JSON.parse(element.dataset.protectedRanges || '[]') });
    } catch (error) {
      element.classList.add('protected-message-editor--invalid');
      console.error(error);
    }
  });
}
