// ----------------------
// STORAGE & INITIALIZATION
// ----------------------
const NOTES_KEY = 'webnote_notes_v1';
let notes = JSON.parse(localStorage.getItem(NOTES_KEY) || '[]');
let selectedNoteId = null;

// DOM references
const notesList = document.getElementById('notesList');
const newNoteBtn = document.getElementById('newNoteBtn');
const notePrioritySelect = document.getElementById('notePriority');
const noteTitleInput = document.getElementById('noteTitleInput');
const noteContent = document.getElementById('noteContent');
const metaCreated = document.getElementById('metaCreated');
const metaUpdated = document.getElementById('metaUpdated');
const metaPriority = document.getElementById('metaPriority');
const metaTags = document.getElementById('metaTags');
const fileInput = document.getElementById('fileInput');
const thumbs = document.getElementById('thumbs');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const autoSummaryBtn = document.getElementById('autoSummaryBtn');
const fullTextSearch = document.getElementById('fullTextSearch');
const tagSearch = document.getElementById('tagSearch');
const tagInput = document.getElementById('tagInput');
const rememberInput = document.getElementById("rememberInput");
const addRememberBtn = document.getElementById("addRememberBtn");
const rememberList = document.getElementById("rememberList");

const notesBtn = document.getElementById("notesViewBtn");
const todoBtn = document.getElementById("todoViewBtn");
const notesView = document.getElementById("notesView");
const todoView = document.getElementById("todoView");
const todoForm = document.getElementById("todoForm");
const todoText = document.getElementById("todoText");
const todoDeadline = document.getElementById("todoDeadline");
const todoList = document.getElementById("todoList");
const todoPriority = document.getElementById("todoPriority");
const appTitle = document.getElementById("appTitle");

// ----------------------
// TTS HELPER
// ----------------------
let ttsVoices = [];
speechSynthesis.onvoiceschanged = () => { ttsVoices = speechSynthesis.getVoices(); };

function speakText(text){
  if(!text || !('speechSynthesis' in window)){
    console.warn('No text or TTS not supported'); return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  // pick a default English voice if available
  utter.voice = ttsVoices.find(v => v.lang.startsWith('en')) || null;
  utter.onerror = (e) => console.error('TTS error', e);
  try { speechSynthesis.speak(utter); }
  catch(err){ console.error('Failed to speak', err); }
}

// Example usage anywhere: speakText("Hello WebNote user!");

// ----------------------
// HELPERS
// ----------------------
function saveNotes() { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function makeId() { return Date.now() + Math.floor(Math.random() * 1000); }
function escapeHtml(s=''){ return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function createNoteObj(priority='Medium'){
  const now = Date.now();
  return {id: makeId(), title:'New note', content:'', created: now, updated: now, priority, tags:[], attachments:[], thingsToRemember:[]};
}

// ----------------------
// RENDER NOTES
// ----------------------
function renderNotes(filterFn=null){
  notesList.innerHTML = '';
  const list = filterFn ? notes.filter(filterFn) : notes;
  if(!list.length){ 
    notesList.innerHTML = `<p style="color:var(--muted); padding:12px;">No notes — click "Add Note" to create one.</p>`; 
    return; 
  }
  list.forEach(note=>{
    const el = document.createElement('article');
    el.className = 'note-item' + (note.id === selectedNoteId ? ' selected' : '');
    el.innerHTML = `
      <div>
        <h3 class="note-title">${escapeHtml(note.title||'Untitled')}</h3>
        <div class="note-meta">
          <span class="note-time">${new Date(note.updated).toLocaleDateString()}</span>
          <span class="note-priority ${note.priority}">${note.priority}</span>
        </div>
      </div>
    `;
    el.onclick = () => selectNote(note.id);
    notesList.appendChild(el);
  });
}

function selectNote(id){
  const note = notes.find(n=>n.id===id);
  if(!note) return;
  selectedNoteId = id;

  noteTitleInput.value = note.title;
  noteContent.innerHTML = note.content || '<p></p>';
  metaCreated.textContent = new Date(note.created).toLocaleString();
  metaUpdated.textContent = new Date(note.updated).toLocaleString();
  metaPriority.textContent = note.priority;
  metaTags.textContent = note.tags.length ? note.tags.join(', ') : '—';

  // Attachments
  thumbs.innerHTML = '';
  (note.attachments||[]).forEach(src=>{
    const img = document.createElement('img'); img.src = src; thumbs.appendChild(img);
  });

  // Things to remember
  rememberList.innerHTML = '';
  note.thingsToRemember.forEach(point=>{
    const li = document.createElement("li");
    li.textContent = point;
    rememberList.appendChild(li);
  });

  renderNotes();
}

// ----------------------
// CRUD OPERATIONS
// ----------------------
function createNote(priority=null){
  const p = priority || notePrioritySelect.value || 'Medium';
  const note = createNoteObj(p);
  notes.unshift(note);
  saveNotes();
  selectNote(note.id);
}

function deleteNote(){
  if(!selectedNoteId) return;
  const idx = notes.findIndex(n=>n.id===selectedNoteId);
  if(idx === -1) return;
  if(!confirm('Delete this note? This cannot be undone.')) return;
  notes.splice(idx,1);
  selectedNoteId = notes.length ? notes[0].id : null;
  saveNotes();
  renderNotes();
  if(selectedNoteId) selectNote(selectedNoteId);
  else clearEditor();
}

function clearEditor(){
  noteTitleInput.value = '';
  noteContent.innerHTML = '<h2>Welcome to WebNote</h2><p>Start typing here...</p>';
  metaCreated.textContent = metaUpdated.textContent = metaPriority.textContent = metaTags.textContent = '—';
  thumbs.innerHTML = rememberList.innerHTML = '';
}

function updateSelectedNote(partial={}) {
  if(!selectedNoteId) return;
  const note = notes.find(n=>n.id===selectedNoteId);
  if(!note) return;
  Object.assign(note, partial);
  note.updated = Date.now();
  metaUpdated.textContent = new Date(note.updated).toLocaleString();
  saveNotes();
  renderNotes();
}

// ----------------------
// EVENT LISTENERS (notes, tags, files, things to remember)
// ----------------------
newNoteBtn.addEventListener('click', () => createNote());
deleteNoteBtn.addEventListener('click', deleteNote);
noteTitleInput.addEventListener('input', e => updateSelectedNote({title: e.target.value}));
noteContent.addEventListener('input', () => updateSelectedNote({content: noteContent.innerHTML}));

// Tags
tagInput.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===','){ e.preventDefault(); commitTags(); } });
tagInput.addEventListener('blur', commitTags);
function commitTags(){
  if(!selectedNoteId) return;
  const raw = tagInput.value.trim();
  if(!raw) return tagInput.value='';
  const parts = raw.split(',').map(t=>t.trim()).filter(Boolean);
  const note = notes.find(n=>n.id===selectedNoteId);
  note.tags = Array.from(new Set([...(note.tags||[]), ...parts]));
  tagInput.value='';
  updateSelectedNote({tags: note.tags});
  metaTags.textContent = note.tags.join(',');
}

// File attachments
fileInput.addEventListener('change', e => {
  if(!selectedNoteId) return;
  Array.from(e.target.files||[]).forEach(file=>{
    if(!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ()=> {
      const note = notes.find(n=>n.id===selectedNoteId);
      note.attachments.push(reader.result);
      saveNotes();
      const img = document.createElement('img'); img.src = reader.result; thumbs.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
  e.target.value='';
});

// Things to remember
addRememberBtn.addEventListener('click', ()=>{
  const text = rememberInput.value.trim();
  if(!text || !selectedNoteId) return;
  const note = notes.find(n=>n.id===selectedNoteId);
  note.thingsToRemember.push(text);
  const li = document.createElement("li"); li.textContent = text; rememberList.appendChild(li);
  rememberInput.value=''; saveNotes();
});

// Full-text search
fullTextSearch.addEventListener('input', e=>{
  const q = (e.target.value||'').toLowerCase();
  renderNotes(q ? n=>(n.title||'').toLowerCase().includes(q) || (n.content||'').toLowerCase().includes(q) : null);
});

// Tag search
tagSearch.addEventListener('input', e=>{
  const q = (e.target.value||'').toLowerCase().trim();
  if(!q) return renderNotes();
  const tokens = q.split(',').map(t=>t.trim()).filter(Boolean);
  renderNotes(n=>tokens.every(tok=> (n.tags||[]).map(t=>t.toLowerCase()).some(t=>t.includes(tok))));
});

// ----------------------
// AUTO-SUMMARY (backend)
// ----------------------
autoSummaryBtn.addEventListener('click', async () => {
  if (!selectedNoteId) return alert('Select a note first.');
  const note = notes.find(n => n.id === selectedNoteId);
  if (!note) return alert('Selected note not found.');
  const title = note.title || 'Untitled';
  const contentHtml = note.content || '';
  const plainText = contentHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g,' ').trim();
  if (!plainText) return alert('No content to summarize.');
  const origText = autoSummaryBtn.textContent;
  autoSummaryBtn.textContent = 'Summarizing...'; autoSummaryBtn.disabled = true;

  try {
    const res = await fetch('http://localhost:5000/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: contentHtml }),
    });
    if (!res.ok) throw new Error(await res.text());
    const payload = await res.json();
    const summary = (payload.summary || '').trim();
    if (!summary) throw new Error('Empty summary returned');

    const summaryTitle = `${title} (Summary)`;
    const newNote = createNoteObj(note.priority || 'Medium');
    newNote.title = summaryTitle;
    newNote.content = `<h3>${escapeHtml(summaryTitle)}</h3><p>${escapeHtml(summary)}</p>`;
    notes.unshift(newNote);
    saveNotes();
    selectedNoteId = newNote.id;
    renderNotes();
    selectNote(newNote.id);
    alert('Summary saved as a new note: ' + summaryTitle);

    // Speak the summary automatically
    speakText(summary);

  } catch (err) {
    console.error('Summarize error', err);
    alert('Summarization failed: ' + (err.message || err));
  } finally {
    autoSummaryBtn.textContent = origText;
    autoSummaryBtn.disabled = false;
  }
});

// ----------------------
// TO-DO LOGIC
// ----------------------
function setMinDeadlineToNow() {
  if (!todoDeadline) return;
  const now = new Date();
  now.setSeconds(0,0);
  const y=now.getFullYear(), m=String(now.getMonth()+1).padStart(2,'0'), d=String(now.getDate()).padStart(2,'0');
  const h=String(now.getHours()).padStart(2,'0'), min=String(now.getMinutes()).padStart(2,'0');
  todoDeadline.min = `${y}-${m}-${d}T${h}:${min}`;
}
setMinDeadlineToNow();
setInterval(setMinDeadlineToNow, 60_000);
todoDeadline?.addEventListener('focus', setMinDeadlineToNow);

function addTodoItem(text, priority='Medium', deadline=''){
  if(!text) return;
  if(deadline){
    const selDate = new Date(deadline), now = new Date(); now.setSeconds(0,0);
    if(selDate < now){ alert('Please choose a deadline in the future.'); return; }
  }

  const li = document.createElement('li'); li.className='todo-item';
  const label = document.createElement('label');
  const checkbox = document.createElement('input'); checkbox.type='checkbox';
  const span = document.createElement('span'); span.className='task-title'; span.textContent=text;
  label.appendChild(checkbox); label.appendChild(span);
  li.appendChild(label);

  // Priority badge
  const prio = document.createElement('span'); prio.className=`priority ${priority}`; prio.textContent=priority;
  li.appendChild(prio);

  // Deadline
  if(deadline){
    const timeEl = document.createElement('time'); timeEl.className='deadline';
    timeEl.textContent = new Date(deadline).toLocaleString([], { dateStyle:'medium', timeStyle:'short' });
    li.appendChild(timeEl);
  }

  // Delete button
  const delBtn = document.createElement('button'); delBtn.type='button';
  delBtn.className='btn danger todo-del-btn'; delBtn.textContent='Delete';
  delBtn.addEventListener('click',()=>li.remove());
  li.appendChild(delBtn);

  todoList.appendChild(li);
}

todoForm.addEventListener('submit', e=>{
  e.preventDefault();
  addTodoItem(todoText.value.trim(), todoPriority.value, todoDeadline.value);
  todoText.value=''; todoDeadline.value=''; todoPriority.value='Medium';
});

// ----------------------
// VIEW TOGGLE
// ----------------------
function toggleView(view){
  if(view==='notes'){
    notesBtn.classList.add("active"); todoBtn.classList.remove("active");
    notesView.classList.remove("hidden"); todoView.classList.add("hidden");
    document.querySelector('.search').style.display='block';
    document.querySelector('.new-note-row').style.display='flex';
    notesList.style.display='block';
    appTitle.textContent='WebNote';
  } else {
    todoBtn.classList.add("active"); notesBtn.classList.remove("active");
    todoView.classList.remove("hidden"); notesView.classList.add("hidden");
    document.querySelector('.search').style.display='none';
    document.querySelector('.new-note-row').style.display='none';
    notesList.style.display='none';
    appTitle.textContent='To-Do';
  }
  appTitle.style.color = "var(--accent)";
}
notesBtn.addEventListener("click", ()=>toggleView('notes'));
todoBtn.addEventListener("click", ()=>toggleView('todo'));

function speakText(text){
    if (!text || !('speechSynthesis' in window)) {
        console.warn('No text or TTS not supported');
        return;
    }

    // Check if voices are ready.
    if (ttsVoices.length === 0) {
        console.warn('TTS voices not yet available. Waiting for onvoiceschanged event.');
        speechSynthesis.onvoiceschanged = () => {
            ttsVoices = speechSynthesis.getVoices();
            // Try speaking again after voices are loaded
            if (ttsVoices.length > 0) {
                speakText(text);
            } else {
                console.error('No TTS voices available on this device.');
            }
        };
        return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = ttsVoices.find(v => v.lang.startsWith('en')) || null;
    if (!utter.voice) {
        console.error('No suitable English voice found.');
        // Fallback to a different voice or none, let the browser pick.
    }

    utter.onerror = (e) => console.error('TTS error', e);
    try { speechSynthesis.speak(utter); }
    catch(err){ console.error('Failed to speak', err); }
}
// ----------------------
// INIT
// ----------------------
function init(){
  if(notes.length===0){
    const starter = createNoteObj('Medium');
    starter.title='Welcome to WebNote';
    starter.content='<h2>Welcome to WebNote</h2><p>Use the Add Note button to create notes, attach images, add tags, and set priority.</p>';
    notes=[starter]; saveNotes();
  }
  selectedNoteId = notes[0].id;
  renderNotes();
  selectNote(selectedNoteId);
}
init();
