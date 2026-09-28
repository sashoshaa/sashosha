function doPost(e) {
  try {
    var data = JSON.parse((e.postData && e.postData.contents) || '{}');
    if ((data.company || '').trim()) return json_({ ok: true });
    if (!data.name || !data.contact) return json_({ ok: false, error: 'empty' });
    appendLead_(data);
    notifyTelegram_(data);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'sashosha-leads' });
}

function appendLead_(data) {
  var sheet = getSheet_();
  sheet.appendRow([
    new Date(),
    data.name || '',
    data.city || '',
    data.class || '',
    data.goal || '',
    data.source || '',
    data.contact || '',
    data.note || ''
  ]);
}

function getSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('sashosha math заявки');
    props.setProperty('SHEET_ID', ss.getId());
    ss.getSheets()[0].appendRow([
      'Дата', 'Имя', 'Город', 'Класс', 'Цель', 'Откуда', 'Контакт', 'Комментарий'
    ]);
  }
  return ss.getSheets()[0];
}

function notifyTelegram_(data) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('BOT_TOKEN');
  if (!token) return;
  var chatId = props.getProperty('CHAT_ID') || discoverChatId_(token);
  if (!chatId) return;
  var lines = [
    'Новая заявка с сайта sashosha math',
    '',
    'Имя: ' + (data.name || ''),
    'Город: ' + (data.city || ''),
    'Класс: ' + (data.class || ''),
    'Цель: ' + (data.goal || ''),
    'Откуда: ' + (data.source || ''),
    'Контакт: ' + (data.contact || '')
  ];
  if ((data.note || '').trim()) lines.push('Комментарий: ' + data.note);
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: lines.join('\n') })
  });
}

function discoverChatId_(token) {
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/getUpdates');
  var updates = JSON.parse(res.getContentText()).result || [];
  for (var i = updates.length - 1; i >= 0; i--) {
    var msg = updates[i].message;
    if (msg && msg.chat && msg.chat.id) {
      var id = String(msg.chat.id);
      PropertiesService.getScriptProperties().setProperty('CHAT_ID', id);
      return id;
    }
  }
  return null;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
