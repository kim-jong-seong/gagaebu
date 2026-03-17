require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '../../data/gagaebu.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// 최초 실행 시 기본 데이터 삽입
const catCount = db.prepare('SELECT COUNT(*) as n FROM categories').get().n;
if (catCount === 0) seedDefaults();

function seedDefaults() {
  const insertCat = db.prepare(`
    INSERT INTO categories (type, name, icon, color, sort_order, is_default)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  [
    ['expense', '식비',    '🍔', '#fff3e0', 1],
    ['expense', '교통',    '🚌', '#e8f5e9', 2],
    ['expense', '주거',    '🏠', '#f3e5f5', 3],
    ['expense', '여가',    '🎬', '#fce4ec', 4],
    ['expense', '교육',    '📚', '#e8f5e9', 5],
    ['expense', '의료',    '💊', '#e3f2fd', 6],
    ['expense', '쇼핑',    '🛍', '#fff8e1', 7],
    ['expense', '기타',    '•',  '#f5f5f5', 8],
    ['income',  '급여',    '💵', '#e3f2fd', 1],
    ['income',  '부업',    '💼', '#f3e5f5', 2],
    ['income',  '이자·배당','📈','#e8f5e9', 3],
    ['income',  '용돈',    '🎁', '#fce4ec', 4],
    ['income',  '환급',    '↩',  '#fff3e0', 5],
    ['income',  '기타',    '•',  '#f5f5f5', 6],
  ].forEach(r => insertCat.run(...r));

  const insertPay = db.prepare(`
    INSERT INTO payment_methods (name, sort_order, is_default) VALUES (?, ?, 1)
  `);
  [['카드', 1], ['현금', 2], ['계좌이체', 3], ['자동입금', 4]].forEach(r => insertPay.run(...r));

  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  [
    ['currency',              'KRW'],
    ['start_day',             '1'],
    ['abbreviation',          'true'],
    ['start_screen',          'dashboard'],
    ['carryover_enabled',     'true'],
    ['carryover_max_months',  '3'],
    ['default_budget',        '2500000'],
    ['profile_name',          '사용자'],
    ['avatar_src',            ''],
  ].forEach(([k, v]) => insertSetting.run(k, v));
}

module.exports = db;
