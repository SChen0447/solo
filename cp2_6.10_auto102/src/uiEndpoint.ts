import type { Endpoint, HttpMethod, Response } from './parser';
import { generateMockResponse, generateDefaultRequestBody } from './parser';

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

interface CustomHeader {
  key: string;
  value: string;
}

export class UIEndpoint {
  private container: HTMLElement;
  private modalRoot: HTMLElement;
  private currentEndpoint: Endpoint | null = null;
  private foldedNodes: Set<string> = new Set();
  private stylesInjected: boolean = false;

  constructor(container: HTMLElement, modalRoot: HTMLElement) {
    this.container = container;
    this.modalRoot = modalRoot;
  }

  renderEndpoint(endpoint: Endpoint): void {
    this.currentEndpoint = endpoint;
    this.foldedNodes.clear();
    this.ensureStyles();

    const methodColor = METHOD_COLORS[endpoint.method] || '#7f8c8d';
    const methodLabel = METHOD_LABELS[endpoint.method] || endpoint.method.toUpperCase();

    const pathParams = endpoint.parameters.filter(p => p.in === 'path');
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    const headerParams = endpoint.parameters.filter(p => p.in === 'header');

    let html = `
      <div class="endpoint-detail">
        <div class="endpoint-header">
          <span class="endpoint-method" style="background: ${methodColor}">${methodLabel}</span>
          <span class="endpoint-path">${this.escapeHtml(endpoint.path)}</span>
        </div>
        ${endpoint.summary ? `<h2 class="endpoint-summary">${this.escapeHtml(endpoint.summary)}</h2>` : ''}
        ${endpoint.description ? `<p class="endpoint-description">${this.escapeHtml(endpoint.description)}</p>` : ''}
    `;

    if (pathParams.length > 0) {
      html += `
        <div class="endpoint-section">
          <h3 class="section-title">路径参数</h3>
          <div class="params-table">
            <div class="params-row params-header">
              <div>参数名</div>
              <div>类型</div>
              <div>必填</div>
              <div>描述</div>
            </div>
            ${pathParams.map(p => `
              <div class="params-row">
                <div class="param-name">${this.escapeHtml(p.name)}</div>
                <div class="param-type">${this.escapeHtml(p.type || 'string')}</div>
                <div>${p.required ? '<span class="badge-required">是</span>' : '<span class="badge-optional">否</span>'}</div>
                <div>${this.escapeHtml(p.description || '-')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (queryParams.length > 0) {
      html += `
        <div class="endpoint-section">
          <h3 class="section-title">查询参数</h3>
          <div class="params-table">
            <div class="params-row params-header">
              <div>参数名</div>
              <div>类型</div>
              <div>必填</div>
              <div>描述</div>
            </div>
            ${queryParams.map(p => `
              <div class="params-row">
                <div class="param-name">${this.escapeHtml(p.name)}</div>
                <div class="param-type">${this.escapeHtml(p.type || 'string')}</div>
                <div>${p.required ? '<span class="badge-required">是</span>' : '<span class="badge-optional">否</span>'}</div>
                <div>${this.escapeHtml(p.description || '-')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (headerParams.length > 0) {
      html += `
        <div class="endpoint-section">
          <h3 class="section-title">请求头参数</h3>
          <div class="params-table">
            <div class="params-row params-header">
              <div>参数名</div>
              <div>类型</div>
              <div>必填</div>
              <div>描述</div>
            </div>
            ${headerParams.map(p => `
              <div class="params-row">
                <div class="param-name">${this.escapeHtml(p.name)}</div>
                <div class="param-type">${this.escapeHtml(p.type || 'string')}</div>
                <div>${p.required ? '<span class="badge-required">是</span>' : '<span class="badge-optional">否</span>'}</div>
                <div>${this.escapeHtml(p.description || '-')}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (endpoint.requestBody) {
      const bodyContent = endpoint.requestBody.content;
      const jsonContent = bodyContent['application/json'] || Object.values(bodyContent)[0];
      if (jsonContent?.schema) {
        html += `
          <div class="endpoint-section">
            <h3 class="section-title">请求体 Schema</h3>
            <div class="code-block-container">
              ${this.renderFoldableJson(jsonContent.schema, 'request-schema', false)}
            </div>
          </div>
        `;
      }
    }

    if (endpoint.responses.length > 0) {
      html += `<div class="endpoint-section"><h3 class="section-title">响应示例</h3>`;

      const successResp = endpoint.responses.find(r => r.statusCode.startsWith('2')) || endpoint.responses[0];
      html += this.renderResponseExample(successResp);

      if (endpoint.responses.length > 1) {
        html += `<div class="other-responses">
          <h4 class="sub-title">其他响应</h4>
          <div class="responses-tabs">`;
        for (const resp of endpoint.responses) {
          if (resp === successResp) continue;
          const statusClass = this.getStatusClass(resp.statusCode);
          html += `<button class="response-tab ${statusClass}" data-status="${this.escapeHtml(resp.statusCode)}">
            ${this.escapeHtml(resp.statusCode)} ${this.escapeHtml(resp.description || '')}
          </button>`;
        }
        html += `</div>
          <div id="other-response-content"></div>
        </div>`;
      }

      html += `</div>`;
    }

    html += `
      <div class="endpoint-actions">
        <button class="btn-send-request" id="btnSendRequest" style="background: ${methodColor}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          发送模拟请求
        </button>
      </div>
    </div>`;

    this.container.innerHTML = html;
    this.bindDetailEvents();
  }

  private renderResponseExample(resp: Response): string {
    if (!resp.content) {
      return `
        <div class="response-block">
          <span class="status-badge ${this.getStatusClass(resp.statusCode)}">${this.escapeHtml(resp.statusCode)}</span>
          <span class="response-desc">${this.escapeHtml(resp.description || '')}</span>
          <div class="code-block-container">
            <pre class="code-block"><code>// 无响应体</code></pre>
          </div>
        </div>
      `;
    }
    const jsonContent = resp.content['application/json'] || Object.values(resp.content)[0];
    const exampleData = jsonContent?.example ?? (jsonContent?.schema ? this.generateExamplePreview(jsonContent.schema) : {});

    return `
      <div class="response-block">
        <span class="status-badge ${this.getStatusClass(resp.statusCode)}">${this.escapeHtml(resp.statusCode)}</span>
        <span class="response-desc">${this.escapeHtml(resp.description || '成功响应')}</span>
        <div class="code-block-container">
          ${this.renderFoldableJson(exampleData, `response-${resp.statusCode}`, true)}
        </div>
      </div>
    `;
  }

  private generateExamplePreview(schema: any): any {
    if (!schema) return {};
    if (schema.example !== undefined) return schema.example;
    if (schema.type === 'object' || schema.properties) {
      const result: any = {};
      for (const key of Object.keys(schema.properties || {})) {
        result[key] = this.generateExamplePreview(schema.properties[key]);
      }
      return result;
    }
    if (schema.type === 'array') {
      return [this.generateExamplePreview(schema.items)];
    }
    if (schema.type === 'string') return 'string';
    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return true;
    if (schema.type === 'null') return null;
    return '...';
  }

  private renderFoldableJson(data: any, baseId: string, isExample: boolean): string {
    return `<div class="foldable-json" id="json-${baseId}">${this.renderJsonNode(data, baseId, 0, isExample)}</div>`;
  }

  private renderJsonNode(data: any, path: string, depth: number, isExample: boolean): string {
    const indent = depth * 16;
    const nodeId = `node-${path}`;

    if (data === null) {
      return `<span class="json-null">null</span>`;
    }
    if (typeof data === 'string') {
      return `<span class="json-string">"${this.escapeHtml(data)}"</span>`;
    }
    if (typeof data === 'number') {
      return `<span class="json-number">${data}</span>`;
    }
    if (typeof data === 'boolean') {
      return `<span class="json-boolean">${data}</span>`;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return `<span class="json-bracket">[]</span>`;
      }
      const isFolded = this.foldedNodes.has(nodeId);
      const preview = isExample && data.length > 0 ? `${data.length} items` : '';
      return `
        <span class="json-fold-toggle" data-node-id="${nodeId}">${isFolded ? '▶' : '▼'}</span>
        <span class="json-bracket">[</span>
        ${isFolded ? `<span class="json-preview">${preview}</span><span class="json-bracket">]</span>` : `
        <div class="json-children" style="padding-left: ${indent + 16}px">
          ${data.map((item, i) => `
            <div class="json-line">
              ${this.renderJsonNode(item, `${path}-${i}`, depth + 1, isExample)}
              ${i < data.length - 1 ? '<span class="json-comma">,</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div style="padding-left: ${indent}px"><span class="json-bracket">]</span></div>
        `}
      `;
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return `<span class="json-bracket">{}</span>`;
      }
      const isFolded = this.foldedNodes.has(nodeId);
      const preview = keys.length > 0 && isExample ? `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}` : '';
      return `
        <span class="json-fold-toggle" data-node-id="${nodeId}">${isFolded ? '▶' : '▼'}</span>
        <span class="json-bracket">{</span>
        ${isFolded ? `<span class="json-preview">${preview}</span><span class="json-bracket">}</span>` : `
        <div class="json-children" style="padding-left: ${indent + 16}px">
          ${keys.map((key, i) => `
            <div class="json-line">
              <span class="json-key">"${this.escapeHtml(key)}"</span>
              <span class="json-colon">: </span>
              ${this.renderJsonNode(data[key], `${path}-${key}`, depth + 1, isExample)}
              ${i < keys.length - 1 ? '<span class="json-comma">,</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div style="padding-left: ${indent}px"><span class="json-bracket">}</span></div>
        `}
      `;
    }

    return String(data);
  }

  private getStatusClass(statusCode: string): string {
    const code = parseInt(statusCode);
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 400 && code < 500) return 'status-error';
    if (code >= 500) return 'status-server-error';
    return 'status-info';
  }

  private bindDetailEvents(): void {
    const foldToggles = this.container.querySelectorAll('.json-fold-toggle');
    foldToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const nodeId = toggle.getAttribute('data-node-id') || '';
        if (this.foldedNodes.has(nodeId)) {
          this.foldedNodes.delete(nodeId);
        } else {
          this.foldedNodes.add(nodeId);
        }
        const jsonContainer = this.container.querySelector('.foldable-json');
        if (jsonContainer && this.currentEndpoint) {
          const parent = toggle.closest('.code-block-container');
          if (parent) {
            const dataSource = this.extractDataFromContainer(parent);
            const idBase = parent.closest('.endpoint-section')?.querySelector('.section-title')?.textContent?.includes('请求体') ? 'request-schema' : 'response-200';
            parent.innerHTML = this.renderFoldableJson(dataSource, idBase, !idBase.includes('schema'));
            parent.querySelectorAll('.json-fold-toggle').forEach(t => {
              t.addEventListener('click', () => this.rebindFoldToggle(t, parent, dataSource, idBase));
            });
          }
        }
      });
    });

    const otherResponseTabs = this.container.querySelectorAll('.response-tab');
    otherResponseTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const statusCode = tab.getAttribute('data-status') || '';
        const resp = this.currentEndpoint?.responses.find(r => r.statusCode === statusCode);
        const otherContent = this.container.querySelector('#other-response-content');
        if (resp && otherContent) {
          otherContent.innerHTML = this.renderResponseExample(resp);
          otherContent.querySelectorAll('.json-fold-toggle').forEach(t => {
            t.addEventListener('click', () => {
              const nodeId = t.getAttribute('data-node-id') || '';
              if (this.foldedNodes.has(nodeId)) {
                this.foldedNodes.delete(nodeId);
              } else {
                this.foldedNodes.add(nodeId);
              }
              const parentBlock = t.closest('.code-block-container');
              if (parentBlock) {
                const dataSource = this.extractDataFromContainer(parentBlock);
                parentBlock.innerHTML = this.renderFoldableJson(dataSource, `response-${statusCode}`, true);
                this.bindFoldTogglesInContainer(parentBlock, dataSource, `response-${statusCode}`);
              }
            });
          });
        }
      });
    });

    const sendBtn = this.container.querySelector('#btnSendRequest');
    if (sendBtn && this.currentEndpoint) {
      sendBtn.addEventListener('click', () => this.openModal(this.currentEndpoint!));
    }
  }

  private rebindFoldToggle(toggle: Element, parent: HTMLElement, data: any, idBase: string): void {
    const nodeId = toggle.getAttribute('data-node-id') || '';
    if (this.foldedNodes.has(nodeId)) {
      this.foldedNodes.delete(nodeId);
    } else {
      this.foldedNodes.add(nodeId);
    }
    parent.innerHTML = this.renderFoldableJson(data, idBase, !idBase.includes('schema'));
    this.bindFoldTogglesInContainer(parent, data, idBase);
  }

  private bindFoldTogglesInContainer(container: Element, data: any, idBase: string): void {
    container.querySelectorAll('.json-fold-toggle').forEach(t => {
      t.addEventListener('click', () => this.rebindFoldToggle(t, container as HTMLElement, data, idBase));
    });
  }

  private extractDataFromContainer(container: Element): any {
    try {
      const text = container.textContent || '';
      const cleaned = text.replace(/[▶▼]/g, '').trim();
      if (cleaned === '' || cleaned === '{}' || cleaned === '[]') return {};
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  private openModal(endpoint: Endpoint): void {
    const methodColor = METHOD_COLORS[endpoint.method] || '#7f8c8d';
    const methodLabel = METHOD_LABELS[endpoint.method] || endpoint.method.toUpperCase();
    const defaultBody = generateDefaultRequestBody(endpoint);

    const customHeaders: CustomHeader[] = [
      { key: 'Content-Type', value: 'application/json' }
    ];

    const modalHtml = `
      <div class="modal-overlay" id="modalOverlay">
        <div class="modal-container" id="modalContainer">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="endpoint-method" style="background: ${methodColor}">${methodLabel}</span>
              <span class="modal-title">${this.escapeHtml(endpoint.path)}</span>
            </div>
            <button class="modal-close" id="modalClose">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <h4 class="modal-section-title">请求头</h4>
              <div id="headersContainer">
                ${customHeaders.map((h, i) => `
                  <div class="header-row" data-idx="${i}">
                    <input type="text" class="header-key" placeholder="Header Name" value="${this.escapeHtml(h.key)}" ${i === 0 ? 'readonly' : ''}/>
                    <span class="header-colon">:</span>
                    <input type="text" class="header-value" placeholder="Value" value="${this.escapeHtml(h.value)}"/>
                    ${i > 0 ? `<button class="header-remove" data-idx="${i}">&times;</button>` : ''}
                  </div>
                `).join('')}
              </div>
              <button class="btn-add-header" id="btnAddHeader">+ 添加请求头</button>
            </div>

            <div class="modal-section">
              <h4 class="modal-section-title">请求体 (JSON)</h4>
              <div class="json-editor-wrapper">
                <textarea id="jsonBodyEditor" class="json-editor" spellcheck="false">${this.escapeHtml(JSON.stringify(defaultBody, null, 2))}</textarea>
              </div>
              <div id="jsonError" class="json-error" style="display: none;"></div>
            </div>

            <div class="modal-actions">
              <button class="btn-send-modal" id="btnSendModal" style="background: ${methodColor}">
                发送
              </button>
            </div>

            <div class="modal-section" id="responseSection" style="display: none;">
              <h4 class="modal-section-title">响应结果</h4>
              <div class="response-meta" id="responseMeta"></div>
              <div class="code-block-container">
                <pre class="code-block"><code id="responseBody"></code></pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalRoot.innerHTML = modalHtml;
    this.ensureModalStyles();
    this.bindModalEvents(endpoint, customHeaders);

    setTimeout(() => {
      const container = document.getElementById('modalContainer');
      if (container) container.classList.add('modal-show');
    }, 10);
  }

  private bindModalEvents(endpoint: Endpoint, headers: CustomHeader[]): void {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const addHeaderBtn = document.getElementById('btnAddHeader');
    const sendBtn = document.getElementById('btnSendModal');
    const bodyEditor = document.getElementById('jsonBodyEditor') as HTMLTextAreaElement;
    const jsonError = document.getElementById('jsonError');

    const closeModal = () => {
      const container = document.getElementById('modalContainer');
      if (container) container.classList.remove('modal-show');
      setTimeout(() => { this.modalRoot.innerHTML = ''; }, 300);
    };

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    closeBtn?.addEventListener('click', closeModal);

    addHeaderBtn?.addEventListener('click', () => {
      const container = document.getElementById('headersContainer');
      if (!container) return;
      const currentCount = container.querySelectorAll('.header-row').length;
      if (currentCount >= 4) {
        addHeaderBtn.disabled = true;
        addHeaderBtn.style.opacity = '0.5';
        return;
      }
      const idx = currentCount;
      const row = document.createElement('div');
      row.className = 'header-row';
      row.setAttribute('data-idx', String(idx));
      row.innerHTML = `
        <input type="text" class="header-key" placeholder="Header Name"/>
        <span class="header-colon">:</span>
        <input type="text" class="header-value" placeholder="Value"/>
        <button class="header-remove" data-idx="${idx}">&times;</button>
      `;
      container.appendChild(row);
      row.querySelector('.header-remove')?.addEventListener('click', () => {
        row.remove();
        const remaining = container.querySelectorAll('.header-row').length;
        if (remaining < 4 && addHeaderBtn) {
          addHeaderBtn.disabled = false;
          addHeaderBtn.style.opacity = '1';
        }
      });
    });

    container?.querySelectorAll('.header-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.getAttribute('data-idx');
        const row = container?.querySelector(`.header-row[data-idx="${idx}"]`);
        row?.remove();
      });
    });

    bodyEditor?.addEventListener('input', () => {
      if (jsonError) jsonError.style.display = 'none';
      try {
        const text = bodyEditor.value;
        if (text.trim()) {
          JSON.parse(text);
        }
        bodyEditor.style.borderColor = '#dfe6e9';
      } catch (e: any) {
        bodyEditor.style.borderColor = '#e74c3c';
      }
    });

    bodyEditor?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = bodyEditor.selectionStart;
        const end = bodyEditor.selectionEnd;
        bodyEditor.value = bodyEditor.value.substring(0, start) + '  ' + bodyEditor.value.substring(end);
        bodyEditor.selectionStart = bodyEditor.selectionEnd = start + 2;
      }

      if (e.key === '{' || e.key === '[' || e.key === '"' || e.key === "'") {
        e.preventDefault();
        const start = bodyEditor.selectionStart;
        const end = bodyEditor.selectionEnd;
        const selected = bodyEditor.value.substring(start, end);
        const pairs: Record<string, string> = { '{': '}', '[': ']', '"': '"', "'": "'" };
        bodyEditor.value = bodyEditor.value.substring(0, start) + e.key + selected + pairs[e.key] + bodyEditor.value.substring(end);
        bodyEditor.selectionStart = start + 1;
        bodyEditor.selectionEnd = start + 1 + selected.length;
      }
    });

    sendBtn?.addEventListener('click', () => {
      if (!bodyEditor || !jsonError) return;
      let parsedBody: any;

      try {
        const text = bodyEditor.value.trim();
        parsedBody = text ? JSON.parse(text) : {};
      } catch (e: any) {
        jsonError.textContent = `JSON 语法错误: ${e.message}`;
        jsonError.style.display = 'block';
        return;
      }

      const headersContainer = document.getElementById('headersContainer');
      const finalHeaders: Record<string, string> = {};
      headersContainer?.querySelectorAll('.header-row').forEach(row => {
        const key = (row.querySelector('.header-key') as HTMLInputElement)?.value.trim();
        const value = (row.querySelector('.header-value') as HTMLInputElement)?.value.trim();
        if (key) finalHeaders[key] = value;
      });

      const result = generateMockResponse(endpoint, '200');
      const responseSection = document.getElementById('responseSection');
      const responseMeta = document.getElementById('responseMeta');
      const responseBody = document.getElementById('responseBody');

      if (responseSection) responseSection.style.display = 'block';
      if (responseMeta) {
        const statusClass = this.getStatusClass(String(result.status));
        responseMeta.innerHTML = `
          <span class="status-badge ${statusClass}">${result.status}</span>
          <span class="response-time">${result.time}ms</span>
          <span class="response-headers-label">请求头:</span>
          <span class="response-headers">
            ${Object.entries(finalHeaders).map(([k, v]) => `<code>${this.escapeHtml(k)}: ${this.escapeHtml(v)}</code>`).join(' ')}
          </span>
        `;
      }
      if (responseBody) {
        responseBody.textContent = JSON.stringify(result.data, null, 2);
        responseBody.parentElement?.parentElement?.classList.add('has-content');
      }
    });
  }

  private ensureStyles(): void {
    if (this.stylesInjected) return;
    this.stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'endpoint-styles';
    style.textContent = `
      .endpoint-detail {
        max-width: 900px;
      }

      .endpoint-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 2px solid #e1e8ed;
      }

      .endpoint-method {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 72px;
        height: 30px;
        padding: 0 12px;
        border-radius: 4px;
        color: white;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      .endpoint-path {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
      }

      .endpoint-summary {
        font-size: 18px;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 8px;
      }

      .endpoint-description {
        color: #576574;
        line-height: 1.6;
        margin-bottom: 24px;
      }

      .endpoint-section {
        margin-bottom: 28px;
      }

      .section-title {
        font-size: 15px;
        font-weight: 600;
        color: #1e3a5f;
        margin-bottom: 12px;
        padding-left: 10px;
        border-left: 3px solid #74b9ff;
      }

      .sub-title {
        font-size: 13px;
        font-weight: 600;
        color: #576574;
        margin: 16px 0 8px 0;
      }

      .params-table {
        border: 1px solid #e1e8ed;
        border-radius: 6px;
        overflow: hidden;
        background: white;
      }

      .params-row {
        display: grid;
        grid-template-columns: 1.2fr 1fr 0.6fr 2fr;
        padding: 10px 14px;
        font-size: 13px;
        border-bottom: 1px solid #ecf0f1;
        transition: background 0.2s ease;
      }

      .params-row:last-child {
        border-bottom: none;
      }

      .params-row:hover {
        background: #f8f9fa;
      }

      .params-header {
        background: #f5f7fa;
        font-weight: 600;
        color: #576574;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      .param-name {
        font-family: 'Consolas', monospace;
        color: #2980b9;
        font-weight: 500;
      }

      .param-type {
        font-family: 'Consolas', monospace;
        color: #e67e22;
      }

      .badge-required {
        display: inline-block;
        padding: 1px 6px;
        background: #ffeaa7;
        color: #d35400;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
      }

      .badge-optional {
        display: inline-block;
        padding: 1px 6px;
        background: #dfe6e9;
        color: #636e72;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 600;
      }

      .code-block-container {
        background: rgba(44, 62, 80, 0.04);
        border: 1px solid #dfe6e9;
        border-radius: 6px;
        padding: 16px;
        overflow-x: auto;
      }

      .code-block {
        margin: 0;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #2c3e50;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .code-block code {
        font-family: inherit;
      }

      .foldable-json {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.7;
      }

      .json-line {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
      }

      .json-fold-toggle {
        display: inline-block;
        cursor: pointer;
        color: #7f8c8d;
        font-size: 10px;
        margin-right: 4px;
        user-select: none;
        transition: color 0.2s ease;
        width: 14px;
        flex-shrink: 0;
      }

      .json-fold-toggle:hover {
        color: #1e3a5f;
      }

      .json-key {
        color: #c0392b;
      }

      .json-string {
        color: #27ae60;
      }

      .json-number {
        color: #2980b9;
      }

      .json-boolean {
        color: #8e44ad;
      }

      .json-null {
        color: #7f8c8d;
        font-style: italic;
      }

      .json-bracket {
        color: #2c3e50;
        font-weight: 600;
      }

      .json-colon {
        color: #7f8c8d;
        margin-right: 4px;
      }

      .json-comma {
        color: #7f8c8d;
      }

      .json-preview {
        color: #95a5a6;
        font-style: italic;
        margin: 0 6px;
      }

      .json-children {
        margin-left: 4px;
      }

      .response-block {
        margin-bottom: 12px;
      }

      .status-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 4px;
        color: white;
        font-size: 12px;
        font-weight: 700;
        margin-right: 8px;
      }

      .status-success { background: #27ae60; }
      .status-error { background: #e67e22; }
      .status-server-error { background: #e74c3c; }
      .status-info { background: #3498db; }

      .response-desc {
        color: #576574;
        font-size: 13px;
      }

      .responses-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }

      .response-tab {
        padding: 4px 10px;
        border: 1px solid #dfe6e9;
        border-radius: 4px;
        background: white;
        color: #576574;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .response-tab:hover {
        border-color: #74b9ff;
        color: #1e3a5f;
      }

      .endpoint-actions {
        margin-top: 32px;
        padding-top: 20px;
        border-top: 1px solid #e1e8ed;
      }

      .btn-send-request {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      .btn-send-request:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        filter: brightness(1.05);
      }

      .btn-send-request:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  private ensureModalStyles(): void {
    if (document.getElementById('modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.44);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        z-index: 10000;
      }

      .modal-container {
        width: 100%;
        max-width: 720px;
        max-height: 85vh;
        background: white;
        border: 2px solid #e1e8ed;
        border-radius: 12px 12px 0 0;
        display: flex;
        flex-direction: column;
        transform: translateY(100%);
        transition: transform 0.3s ease-out;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
      }

      .modal-container.modal-show {
        transform: translateY(0);
      }

      @media (min-width: 769px) {
        .modal-overlay {
          align-items: center;
        }
        .modal-container {
          border-radius: 12px;
          max-height: 80vh;
        }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #ecf0f1;
        flex-shrink: 0;
      }

      .modal-title {
        font-family: 'Consolas', monospace;
        font-size: 15px;
        font-weight: 600;
        color: #2c3e50;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #95a5a6;
        cursor: pointer;
        line-height: 1;
        padding: 0 4px;
        transition: color 0.2s ease;
      }

      .modal-close:hover {
        color: #2c3e50;
      }

      .modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .modal-section {
        margin-bottom: 20px;
      }

      .modal-section-title {
        font-size: 13px;
        font-weight: 600;
        color: #1e3a5f;
        margin-bottom: 10px;
      }

      .header-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .header-key,
      .header-value {
        padding: 8px 10px;
        border: 1px solid #dfe6e9;
        border-radius: 4px;
        font-size: 13px;
        font-family: 'Consolas', monospace;
        transition: border-color 0.2s ease;
        outline: none;
      }

      .header-key {
        flex: 1;
        min-width: 0;
      }

      .header-value {
        flex: 1.5;
        min-width: 0;
      }

      .header-key:focus,
      .header-value:focus {
        border-color: #74b9ff;
      }

      .header-colon {
        color: #7f8c8d;
        font-weight: 600;
      }

      .header-remove {
        background: none;
        border: none;
        color: #e74c3c;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        transition: opacity 0.2s ease;
      }

      .header-remove:hover {
        opacity: 0.7;
      }

      .btn-add-header {
        background: transparent;
        border: 1px dashed #b2bec3;
        color: #636e72;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-add-header:hover {
        border-color: #74b9ff;
        color: #1e3a5f;
        background: #f8fbff;
      }

      .json-editor-wrapper {
        border: 1px solid #dfe6e9;
        border-radius: 6px;
        overflow: hidden;
      }

      .json-editor {
        width: 100%;
        min-height: 160px;
        padding: 12px;
        border: none;
        outline: none;
        resize: vertical;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        color: #2c3e50;
        background: #fafbfc;
        transition: border-color 0.2s ease;
      }

      .json-error {
        margin-top: 8px;
        padding: 8px 12px;
        background: #ffeaea;
        color: #c0392b;
        border-radius: 4px;
        font-size: 12px;
        font-family: 'Consolas', monospace;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        margin: 20px 0;
      }

      .btn-send-modal {
        padding: 10px 32px;
        border: none;
        border-radius: 6px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      .btn-send-modal:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        filter: brightness(1.05);
      }

      .response-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        padding: 10px 12px;
        background: #f5f7fa;
        border-radius: 6px;
        font-size: 12px;
      }

      .response-time {
        padding: 2px 8px;
        background: #e8f6f3;
        color: #16a085;
        border-radius: 3px;
        font-weight: 600;
        font-family: 'Consolas', monospace;
      }

      .response-headers-label {
        color: #636e72;
        font-weight: 600;
      }

      .response-headers {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .response-headers code {
        background: white;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid #dfe6e9;
        font-size: 11px;
        color: #2c3e50;
      }
    `;
    document.head.appendChild(style);
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
