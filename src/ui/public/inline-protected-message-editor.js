export function normaliseProtectedRanges(message, ranges = []) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let end = 0;
  return sorted.map((range) => {
    if (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || range.start < end || range.end < range.start || range.end > message.length) {
      throw new Error('Protected message ranges are invalid.');
    }
    end = range.end;
    return { start: range.start, end: range.end };
  });
}

export function createMessageSegments(message, protectedRanges = []) {
  const ranges = normaliseProtectedRanges(message, protectedRanges);
  const segments = [];
  const append = (type, value) => {
    value.split('\n').forEach((part, index, parts) => {
      if (part) segments.push({ id: `segment-${segments.length + 1}`, type, value: part });
      if (index < parts.length - 1) segments.push({ id: `segment-${segments.length + 1}`, type: 'newline', value: '\n', protected: type === 'protected' });
    });
  };
  let cursor = 0;
  ranges.forEach((range) => {
    append('editable', message.slice(cursor, range.start));
    append('protected', message.slice(range.start, range.end));
    cursor = range.end;
  });
  append('editable', message.slice(cursor));
  return segments;
}

export class InlineProtectedMessageEditor {
  constructor({ container, message, protectedRanges, name = 'message' }) {
    if (!container) throw new Error('An editor container is required.');
    this.container = container;
    this.name = name;
    this.originalMessage = message.replace(/\r\n?/g, '\n');
    this.ranges = normaliseProtectedRanges(this.originalMessage, protectedRanges);
    this.segments = createMessageSegments(this.originalMessage, this.ranges);
    this.protectedValues = this.segments.filter((segment) => segment.type === 'protected').map((segment) => segment.value);
    this.hiddenField = container.querySelector('[data-inline-message-value]');
    this.document = container.querySelector('[data-inline-message-document]');
    this.measure = container.querySelector('[data-inline-message-measure]');
    this.render();
    this.onSubmit = () => { this.hiddenField.value = this.getValue(); };
    this.container.closest('form')?.addEventListener('submit', this.onSubmit);
  }

  getValue() { return this.segments.map((segment) => segment.value).join(''); }
  getSegments() { return this.segments.map((segment) => ({ ...segment })); }
  validate() {
    const current = this.segments.filter((segment) => segment.type === 'protected').map((segment) => segment.value);
    return current.length === this.protectedValues.length && current.every((value, index) => value === this.protectedValues[index]);
  }
  reset() { this.segments = createMessageSegments(this.originalMessage, this.ranges); this.render(); }
  destroy() { this.container.closest('form')?.removeEventListener('submit', this.onSubmit); this.document.replaceChildren(); }

  render() {
    this.document.replaceChildren();
    let line = this.createLine();
    this.document.append(line);
    this.segments.forEach((segment) => {
      if (segment.type === 'newline') {
        line = this.createLine();
        this.document.append(line);
      } else if (segment.type === 'protected') {
        const span = document.createElement('span');
        span.className = 'inline-protected-text';
        span.textContent = segment.value;
        line.append(span);
      } else {
        line.append(this.createEditableControl(segment));
      }
    });
    this.hiddenField.value = this.getValue();
  }

  createLine() {
    const line = document.createElement('div');
    line.className = 'inline-message-line';
    return line;
  }

  createEditableControl(segment) {
    const long = segment.value.length > 72 || segment.value.includes('\n');
    const control = document.createElement(long ? 'textarea' : 'input');
    control.className = long
      ? 'govuk-textarea inline-editable-textarea'
      : 'govuk-input inline-editable-input';
    control.value = segment.value;
    control.setAttribute('aria-label', 'Editable message text');
    if (long) { control.rows = 1; control.wrap = 'soft'; }
    else control.type = 'text';
    const update = () => { segment.value = control.value; this.hiddenField.value = this.getValue(); this.resize(control); };
    control.addEventListener('input', update);
    control.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && control.tagName === 'INPUT') {
        event.preventDefault();
        const position = control.selectionStart;
        segment.value = `${control.value.slice(0, position)}\n${control.value.slice(control.selectionEnd)}`;
        this.render();
      }
    });
    this.resize(control);
    return control;
  }

  resize(control) {
    if (control.tagName === 'TEXTAREA') {
      control.style.height = 'auto';
      control.style.height = `${control.scrollHeight}px`;
      return;
    }
    this.measure.textContent = control.value || ' ';
    const width = Math.min(this.container.clientWidth || 600, Math.max(24, this.measure.getBoundingClientRect().width + 6));
    control.style.width = `${width}px`;
  }
}

export function initialiseInlineProtectedMessageEditors(root = document) {
  root.querySelectorAll('[data-inline-protected-message-editor]').forEach((container) => {
    const source = container.querySelector('[data-inline-message-source]');
    try {
      new InlineProtectedMessageEditor({
        container,
        message: source.value,
        protectedRanges: JSON.parse(container.dataset.protectedRanges || '[]'),
        name: container.dataset.name || 'message',
      });
    } catch (error) {
      container.classList.add('inline-message-editor--error');
      console.error(error);
    }
  });
}
