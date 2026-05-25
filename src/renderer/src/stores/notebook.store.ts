import { create } from 'zustand'

interface Notebook {
  id: string; name: string; color: string; icon: string; sort_order: number
  created_at: string; updated_at: string
}

interface Doc {
  id: string; notebook_id: string; title: string; content: string | null; plain_text: string
  sort_order: number; last_opened_at: string | null; created_at: string; updated_at: string
}

interface NotebookState {
  notebooks: Notebook[]
  selectedNotebookId: string | null
  documents: Doc[]
  openDocs: { id: string; title: string }[]
  activeDocId: string | null
  setNotebooks: (notebooks: Notebook[]) => void
  setSelectedNotebook: (id: string | null) => void
  setDocuments: (docs: Doc[]) => void
  openDocument: (doc: { id: string; title: string }) => void
  closeDocument: (id: string) => void
  setActiveDoc: (id: string | null) => void
  addNotebook: (nb: Notebook) => void
  removeNotebook: (id: string) => void
  addDocument: (doc: Doc) => void
  removeDocument: (id: string) => void
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  selectedNotebookId: null,
  documents: [],
  openDocs: [],
  activeDocId: null,

  setNotebooks: (notebooks) => set({ notebooks }),

  setSelectedNotebook: (id) => {
    set({ selectedNotebookId: id, documents: [] })
  },

  setDocuments: (documents) => set({ documents }),

  openDocument: (doc) => {
    const { openDocs } = get()
    if (!openDocs.find(d => d.id === doc.id)) {
      set({ openDocs: [...openDocs, doc], activeDocId: doc.id })
    } else {
      set({ activeDocId: doc.id })
    }
  },

  closeDocument: (id) => {
    const { openDocs, activeDocId } = get()
    const idx = openDocs.findIndex(d => d.id === id)
    const newOpen = openDocs.filter(d => d.id !== id)
    let newActive = activeDocId
    if (activeDocId === id) {
      if (newOpen.length > 0) {
        const newIdx = Math.min(idx, newOpen.length - 1)
        newActive = newOpen[newIdx].id
      } else {
        newActive = null
      }
    }
    set({ openDocs: newOpen, activeDocId: newActive })
  },

  setActiveDoc: (id) => set({ activeDocId: id }),

  addNotebook: (nb) => set((s) => ({ notebooks: [...s.notebooks, nb] })),

  removeNotebook: (id) => set((s) => ({
    notebooks: s.notebooks.filter(n => n.id !== id),
    selectedNotebookId: s.selectedNotebookId === id ? null : s.selectedNotebookId
  })),

  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),

  removeDocument: (id) => set((s) => ({
    documents: s.documents.filter(d => d.id !== id),
    openDocs: s.openDocs.filter(d => d.id !== id),
    activeDocId: s.activeDocId === id ? null : s.activeDocId
  }))
}))
