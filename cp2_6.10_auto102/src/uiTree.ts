import type { ParsedDocument, Endpoint, HttpMethod } from './parser';

const METHOD_COLORS: Record<HttpMethod, string> = {
  get: '#27ae60',
  post: '#2980b9',
  put: '#f39c12',
  delete: '#e74c3c',
  patch: '#9b59b6',
  options: '#34495e',
  head: '#7f8c8d'
};

const METHOD_LABELS: Record<HttpMethod, string> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patch: 'PATCH',
  options: 'OPTIONS',
  head: 'HEAD'
};

export interface TreeCallbacks {
  onEndpointSelect: (endpoint: Endpoint) => void;
}

export class UITree {
  private container: HTMLElement;
  private callbacks: TreeCallbacks;
  private document: ParsedDocument | null = null;
  private selectedEndpointId: string | null = null;
  private expandedTags: Set<string> = new Set();

  constructor(container: HTMLElement, callbacks: TreeCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
  }

  setDocument(doc: ParsedDocument | null): void {
    this.document = doc;
    this.selectedEndpointId = null;
    if (doc) {
      for (const tag of doc.tags) {
        this.expandedTags.add(tag.name);
      }
    }
    this.render();
  }

  selectEndpoint(endpointId: string): void {
    this.selectedEndpointId = endpointId;
    this.updateHighlight();
  }

  private render(): void {
    if (!this.document || this.document.endpoints.length === 0) {
      this.container.innerHTML = `
        <div style="padding: 16px; text-align: center; color: rgba(255,255,255,0.5); font-size: 13px;">
          请上传 OpenAPI/Swagger 文档
        </div>
      `;
      return;
    }

    const doc = this.document;
    let html = '';

    for (const tag of doc.tags) {
      const tagEndpoints = doc.endpointsByTag[tag.name] || [];
      if (tagEndpoints.length === 0) continue;

      const isExpanded = this.expandedTags.has(tag.name);
      const tagId = `tag-${this.escapeHtml(tag.name)}`;

      html += `
        <div class="tree-tag" data-tag="${this.escapeHtml(tag.name)}">
          <div class="tree-tag-header" id="${tagId}-header">
            <svg class="tree-arrow ${isExpanded ? 'expanded' : ''}" 
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span class="tree-tag-title">${this.escapeHtml(tag.name)}</span>
            <span class="tree-tag-count">${tagEndpoints.length}</span>
          </div>
          <div class="tree-tag-children" ${isExpanded ? '' : 'style="display: none;"'}>
      `;

      for (const endpoint of tagEndpoints) {
        const isSelected = endpoint.id === this.selectedEndpointId;
        const methodColor = METHOD_COLORS[endpoint.method] || '#7f8c8d';
        const methodLabel = METHOD_LABELS[endpoint.method] || endpoint.method.toUpperCase();

        html += `
          <div class="tree-endpoint ${isSelected ? 'selected' : ''}" 
               data-endpoint-id="${this.escapeHtml(endpoint.id)}">
            <span class="tree-method-badge" style="background: ${methodColor}">
              ${methodLabel}
            </span>
            <span class="tree-endpoint-path" title="${this.escapeHtml(endpoint.path)}">
              ${this.escapeHtml(endpoint.path)}
            </span>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    this.container.innerHTML = html;
    this.injectStyles();
    this.bindEvents();
  }

  private injectStyles(): void {
    if (document.getElementById('tree-styles')) return;

    const style = document.createElement('style');
    style.id = 'tree-styles';
    style.textContent = `
      .tree-tag {
        margin-bottom: 2px;
      }

      .tree-tag-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
        font-weight: 600;
        transition: background 0.2s ease;
        user-select: none;
      }

      .tree-tag-header:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .tree-arrow {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        color: rgba(255, 255, 255, 0.6);
        transition: transform 0.2s ease;
      }

      .tree-arrow.expanded {
        transform: rotate(90deg);
      }

      .tree-tag-title {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tree-tag-count {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 6px;
        border-radius: 10px;
      }

      .tree-tag-children {
        overflow: hidden;
      }

      .tree-endpoint {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px 8px 38px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-left: 3px solid transparent;
      }

      .tree-endpoint:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      .tree-endpoint.selected {
        background: rgba(116, 185, 255, 0.15);
        border-left-color: #74b9ff;
      }

      .tree-method-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        height: 20px;
        padding: 0 6px;
        border-radius: 3px;
        color: white;
        font-size: 10px;
        font-weight: 700;
        flex-shrink: 0;
        letter-spacing: 0.3px;
      }

      .tree-endpoint-path {
        flex: 1;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: 'Consolas', 'Monaco', monospace;
      }

      .tree-endpoint.selected .tree-endpoint-path {
        color: white;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    const tagHeaders = this.container.querySelectorAll('.tree-tag-header');
    tagHeaders.forEach(header => {
      header.addEventListener('click', () => {
        const tagEl = header.closest('.tree-tag');
        if (!tagEl) return;
        const tagName = tagEl.getAttribute('data-tag') || '';
        const children = tagEl.querySelector('.tree-tag-children') as HTMLElement;
        const arrow = header.querySelector('.tree-arrow') as HTMLElement;

        if (this.expandedTags.has(tagName)) {
          this.expandedTags.delete(tagName);
          if (children) children.style.display = 'none';
          if (arrow) arrow.classList.remove('expanded');
        } else {
          this.expandedTags.add(tagName);
          if (children) children.style.display = 'block';
          if (arrow) arrow.classList.add('expanded');
        }
      });
    });

    const endpointEls = this.container.querySelectorAll('.tree-endpoint');
    endpointEls.forEach(el => {
      el.addEventListener('click', () => {
        const endpointId = el.getAttribute('data-endpoint-id') || '';
        const endpoint = this.findEndpoint(endpointId);
        if (endpoint) {
          this.selectedEndpointId = endpointId;
          this.updateHighlight();
          this.callbacks.onEndpointSelect(endpoint);
        }
      });
    });
  }

  private updateHighlight(): void {
    const endpointEls = this.container.querySelectorAll('.tree-endpoint');
    endpointEls.forEach(el => {
      const id = el.getAttribute('data-endpoint-id');
      if (id === this.selectedEndpointId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  private findEndpoint(id: string): Endpoint | null {
    if (!this.document) return null;
    return this.document.endpoints.find(e => e.id === id) || null;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
