<template>
  <div id="note-app">
    <h1>Express + Vue</h1>
    <div class="note-input">
      <input type="text" v-model="newNote" placeholder="Add a note" />
      <button id="add-button" @click="addNote">Add Note</button>
    </div>
    <div class="list-warpper">
      <div class="note" v-for="(note, index) in notes" :key="index">
        <input type="text" v-model="note.content" @change="editNote(note.id, note.content)" />
        <button @click="deleteNote(note.id)">x</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getNotes, addNote as addNoteApi, deleteNote as deleteNoteApi, editNote as editNoteApi } from '@/api'

const newNote = ref("");
const notes = ref([]);

const fetchNotes = async () => {
  const response = await getNotes()
  notes.value = response;
};

onMounted(() => {
  fetchNotes()
});

const addNote = async () => {
  if (newNote.value.trim() !== "") {
    await addNoteApi({ content: newNote.value });
    newNote.value = "";
    fetchNotes()
  }
};

const editNote = async (id, content) => {
  if (content.trim() !== "") {
    await editNoteApi({ id, content })
    fetchNotes()
  }
};

const deleteNote = async id => {
  await deleteNoteApi({ id })
  fetchNotes()
};
</script>

<style scoped lang="less">
#note-app {
  font-family: Arial, sans-serif;
  width: 60%;
  min-width: 350px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f4f4f4;
  border-radius: 5px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.note-input {
  display: flex;
  align-items: center;
  margin-bottom: 20px;

  input {
    flex: 1;
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }
}

.list-warpper {
  max-height: calc(100vh - 430px);
  overflow-y: auto;
}

#add-button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #4CAF50;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-left: 10px;
}

.note {
  display: flex;
  align-items: center;
  margin-bottom: 10px;

  input {
    flex: 1;
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;

  }

  button {
    padding: 5px 10px;
    font-size: 16px;
    background-color: #f44336;
    color: #fff;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    margin-left: 10px;
  }
}
</style>