const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.querySelector("#load-btn");
const statusText = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

// Reusable async request function checking response.ok and throwing on errors
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP Error! Status: ${response.status}`);
  }
  if (response.status === 204) {
    return null;
  }
  return await response.json();
}

// Render helper using textContent exclusively for security and safe text injection
function renderNotes(notes) {
  notesList.innerHTML = "";

  if (!notes || notes.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.textContent = "No notes available.";
    notesList.appendChild(emptyLi);
    return;
  }

  notes.forEach((note) => {
    const li = document.createElement("li");
    li.className = "note-card";
    li.dataset.id = note.id;

    const contentDiv = document.createElement("div");
    contentDiv.className = "note-content";

    const h3 = document.createElement("h3");
    h3.textContent = `#${note.id}: ${note.title}`;

    const p = document.createElement("p");
    p.textContent = note.body || "No content provided.";

    contentDiv.appendChild(h3);
    contentDiv.appendChild(p);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteNote(note.id, li));

    li.appendChild(contentDiv);
    li.appendChild(deleteBtn);
    notesList.appendChild(li);
  });
}

// Task 1: GET - Load 10 notes with try/catch/finally, status updates, and button state management
async function loadNotes() {
  statusText.textContent = "Loading notes...";
  statusText.className = "status-msg";
  loadBtn.disabled = true;

  try {
    const notes = await request(`${API_URL}?_limit=10`);
    renderNotes(notes);
    statusText.textContent = "Loaded 10 notes from the server.";
    statusText.className = "status-msg status-success";
  } catch (error) {
    statusText.textContent = "Could not load notes. Please try again.";
    statusText.className = "status-msg status-error";
    console.error("GET Error:", error);
  } finally {
    loadBtn.disabled = false;
  }
}

// Task 2: POST - Create note with input validation
async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    alert("Title is required.");
    return;
  }
  if (title.length > 100) {
    alert("Title must not exceed 100 characters.");
    return;
  }

  statusText.textContent = "Creating note...";
  statusText.className = "status-msg";
  submitBtn.disabled = true;

  try {
    const responseObj = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    if (!responseObj.ok) {
      throw new Error(`Status ${responseObj.status}`);
    }

    const createdNote = await responseObj.json();
    
    // Note: JSONPlaceholder is a mock API that always returns ID 101 and does not persist records.
    // We prepend the created note locally to simulate successful server response persistence.
    prependSingleNote(createdNote);

    statusText.textContent = `Note created (status ${responseObj.status}, id ${createdNote.id}).`;
    statusText.className = "status-msg status-success";
    
    titleInput.value = "";
    bodyInput.value = "";
  } catch (error) {
    statusText.textContent = "Could not create the note.";
    statusText.className = "status-msg status-error";
    console.error("POST Error:", error);
  } finally {
    submitBtn.disabled = false;
  }
}

function prependSingleNote(note) {
  const emptyState = notesList.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  const li = document.createElement("li");
  li.className = "note-card";
  li.dataset.id = note.id;

  const contentDiv = document.createElement("div");
  contentDiv.className = "note-content";

  const h3 = document.createElement("h3");
  h3.textContent = `#${note.id}: ${note.title}`;

  const p = document.createElement("p");
  p.textContent = note.body || "No content provided.";

  contentDiv.appendChild(h3);
  contentDiv.appendChild(p);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteNote(note.id, li));

  li.appendChild(contentDiv);
  li.appendChild(deleteBtn);
  notesList.prepend(li);
}

// Task 3: DELETE - Remove note
async function deleteNote(id, listItemElement) {
  try {
    // Note: Because JSONPlaceholder is a mock API, DELETE requests return success 
    // but do not alter backend server storage. We safely remove the DOM element locally for instant UI feedback.
    await request(`${API_URL}/${id}`, { method: "DELETE" });
    
    listItemElement.remove();
    
    if (notesList.children.length === 0) {
      renderNotes([]);
    }
    
    statusText.textContent = `Note #${id} successfully deleted.`;
    statusText.className = "status-msg status-success";
  } catch (error) {
    statusText.textContent = `Could not delete note #${id}.`;
    statusText.className = "status-msg status-error";
    console.error("DELETE Error:", error);
  }
}

loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);