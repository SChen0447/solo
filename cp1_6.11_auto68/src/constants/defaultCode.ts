export const DEFAULT_HTML = `<div class="container">
  <h1>你好，世界！</h1>
  <p>欢迎使用代码实时编辑沙盒</p>
  <button id="btn">点击我</button>
  <p id="output"></p>
</div>`;

export const DEFAULT_CSS = `body {
  font-family: 'Segoe UI', Tahoma, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.container {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  text-align: center;
}

h1 {
  color: #333;
  margin-top: 0;
}

p {
  color: #666;
}

button {
  background: #0078D4;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #106ebe;
}

#output {
  margin-top: 20px;
  font-weight: bold;
  color: #0078D4;
}`;

export const DEFAULT_JS = `const btn = document.getElementById('btn');
const output = document.getElementById('output');
let count = 0;

btn.addEventListener('click', () => {
  count++;
  output.textContent = '你已经点击了 ' + count + ' 次';
});`;
