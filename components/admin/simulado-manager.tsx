'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  FileQuestion,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  getSimuladoQuestions,
  saveSimuladoQuestion,
  deleteSimuladoQuestion,
  type SimuladoQuestion
} from '@/lib/firebase/firestore-service'

interface SimuladoManagerProps {
  adminUid: string
  adminEmail: string | null
}

const EMPTY_QUESTION: Omit<SimuladoQuestion, 'id' | 'updatedAt'> = {
  enunciado: '',
  alternativas: ['', '', '', ''],
  respostaCorreta: 0,
  explicacao: '',
  imagemBase64: '',
  ordem: 0
}

export default function SimuladoManager({ adminUid, adminEmail }: SimuladoManagerProps) {
  const [questions, setQuestions] = useState<SimuladoQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<SimuladoQuestion | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadQuestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getSimuladoQuestions()
      setQuestions(data)
    } catch (error) {
      console.error('Erro ao carregar questões:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const handleNewQuestion = () => {
    const newQ: SimuladoQuestion = {
      id: `new_${Date.now()}`,
      ...EMPTY_QUESTION,
      ordem: questions.length + 1
    }
    setEditingQuestion(newQ)
    setIsAddingNew(true)
    setExpandedId(newQ.id)
    setSaveStatus('idle')
  }

  const handleEdit = (question: SimuladoQuestion) => {
    setEditingQuestion({ ...question })
    setExpandedId(question.id)
    setIsAddingNew(false)
    setSaveStatus('idle')
    setShowImagePreview(false)
  }

  const handleCancelEdit = () => {
    setEditingQuestion(null)
    setIsAddingNew(false)
    setExpandedId(null)
    setSaveStatus('idle')
    setShowImagePreview(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingQuestion) return

    if (file.size > 500 * 1024) {
      alert('Imagem muito grande. Use uma imagem menor que 500KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      setEditingQuestion(prev => prev ? { ...prev, imagemBase64: base64 } : prev)
    }
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  const handleRemoveImage = () => {
    setEditingQuestion(prev => prev ? { ...prev, imagemBase64: '' } : prev)
    setShowImagePreview(false)
  }

  const handleAlternativaChange = (index: number, value: string) => {
    if (!editingQuestion) return
    const alternativas = [...editingQuestion.alternativas]
    alternativas[index] = value
    setEditingQuestion({ ...editingQuestion, alternativas })
  }

  const handleSave = async () => {
    if (!editingQuestion) return

    if (!editingQuestion.enunciado.trim()) {
      alert('O enunciado da questão é obrigatório.')
      return
    }
    if (editingQuestion.alternativas.some(a => !a.trim())) {
      alert('Todas as alternativas devem ser preenchidas.')
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const questionToSave = isAddingNew
        ? { ...editingQuestion, id: undefined as any }
        : editingQuestion

      await saveSimuladoQuestion(adminUid, adminEmail, questionToSave)
      setSaveStatus('success')
      await loadQuestions()
      setTimeout(() => {
        setEditingQuestion(null)
        setIsAddingNew(false)
        setExpandedId(null)
        setSaveStatus('idle')
        setShowImagePreview(false)
      }, 1200)
    } catch (error) {
      console.error('Erro ao salvar questão:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) return

    setIsDeleting(questionId)
    try {
      await deleteSimuladoQuestion(adminUid, adminEmail, questionId)
      await loadQuestions()
      if (expandedId === questionId) {
        setExpandedId(null)
        setEditingQuestion(null)
      }
    } catch (error) {
      console.error('Erro ao excluir questão:', error)
      alert('Erro ao excluir questão.')
    } finally {
      setIsDeleting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {questions.length} questão(ões) cadastrada(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadQuestions}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
            title="Recarregar"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleNewQuestion}
            disabled={isAddingNew}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Nova Questão
          </button>
        </div>
      </div>

      {/* New question form (shown at top when adding) */}
      {isAddingNew && editingQuestion && (
        <QuestionForm
          question={editingQuestion}
          isNew
          isSaving={isSaving}
          saveStatus={saveStatus}
          showImagePreview={showImagePreview}
          fileInputRef={fileInputRef}
          onEnunciadoChange={(v) => setEditingQuestion({ ...editingQuestion, enunciado: v })}
          onAlternativaChange={handleAlternativaChange}
          onRespostaCorretaChange={(i) => setEditingQuestion({ ...editingQuestion, respostaCorreta: i })}
          onExplicacaoChange={(v) => setEditingQuestion({ ...editingQuestion, explicacao: v })}
          onOrdemChange={(v) => setEditingQuestion({ ...editingQuestion, ordem: v })}
          onImageUpload={handleImageUpload}
          onRemoveImage={handleRemoveImage}
          onToggleImagePreview={() => setShowImagePreview(p => !p)}
          onSave={handleSave}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Questions list */}
      {questions.length === 0 && !isAddingNew ? (
        <div className="bg-secondary/50 rounded-xl p-8 text-center">
          <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-bold text-foreground mb-2">Nenhuma questão cadastrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie a primeira questão do simulado final clicando no botão acima.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => {
            const isExpanded = expandedId === question.id
            const isEditing = editingQuestion?.id === question.id && !isAddingNew

            return (
              <div
                key={question.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Question header */}
                <div className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 mt-0.5">
                    {question.ordem || index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-2">
                      {question.enunciado || <span className="text-muted-foreground italic">Sem enunciado</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {question.imagemBase64 && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <ImageIcon className="w-3 h-3" />
                          Com imagem
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Resp: alternativa {['A', 'B', 'C', 'D'][question.respostaCorreta]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (isEditing) {
                          handleCancelEdit()
                        } else {
                          handleEdit(question)
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      disabled={isDeleting === question.id}
                      className="p-1.5 text-destructive rounded-lg hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {isDeleting === question.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded && !isEditing ? null : question.id)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded: edit form or read-only view */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {isEditing ? (
                      <QuestionForm
                        question={editingQuestion!}
                        isNew={false}
                        isSaving={isSaving}
                        saveStatus={saveStatus}
                        showImagePreview={showImagePreview}
                        fileInputRef={fileInputRef}
                        onEnunciadoChange={(v) => setEditingQuestion({ ...editingQuestion!, enunciado: v })}
                        onAlternativaChange={handleAlternativaChange}
                        onRespostaCorretaChange={(i) => setEditingQuestion({ ...editingQuestion!, respostaCorreta: i })}
                        onExplicacaoChange={(v) => setEditingQuestion({ ...editingQuestion!, explicacao: v })}
                        onOrdemChange={(v) => setEditingQuestion({ ...editingQuestion!, ordem: v })}
                        onImageUpload={handleImageUpload}
                        onRemoveImage={handleRemoveImage}
                        onToggleImagePreview={() => setShowImagePreview(p => !p)}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                      />
                    ) : (
                      <QuestionReadOnly question={question} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Read-only view ───────────────────────────────────────────────────────────

function QuestionReadOnly({ question }: { question: SimuladoQuestion }) {
  const LABELS = ['A', 'B', 'C', 'D']

  return (
    <div className="p-4 space-y-4">
      {question.imagemBase64 && (
        <div className="rounded-lg overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.imagemBase64}
            alt="Imagem da questão"
            className="max-h-64 w-full object-contain bg-secondary"
          />
        </div>
      )}
      <p className="text-foreground">{question.enunciado}</p>
      <div className="space-y-2">
        {question.alternativas.map((alt, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 p-2.5 rounded-lg text-sm ${
              i === question.respostaCorreta
                ? 'bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400'
                : 'bg-secondary text-foreground'
            }`}
          >
            <span className="font-bold flex-shrink-0">{LABELS[i]})</span>
            <span>{alt}</span>
            {i === question.respostaCorreta && (
              <Check className="w-4 h-4 ml-auto flex-shrink-0 text-green-500" />
            )}
          </div>
        ))}
      </div>
      {question.explicacao && (
        <div className="p-3 bg-secondary/60 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Explicação:</p>
          <p className="text-sm text-foreground">{question.explicacao}</p>
        </div>
      )}
    </div>
  )
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface QuestionFormProps {
  question: SimuladoQuestion
  isNew: boolean
  isSaving: boolean
  saveStatus: 'idle' | 'success' | 'error'
  showImagePreview: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  onEnunciadoChange: (v: string) => void
  onAlternativaChange: (index: number, value: string) => void
  onRespostaCorretaChange: (i: number) => void
  onExplicacaoChange: (v: string) => void
  onOrdemChange: (v: number) => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: () => void
  onToggleImagePreview: () => void
  onSave: () => void
  onCancel: () => void
}

function QuestionForm({
  question,
  isNew,
  isSaving,
  saveStatus,
  showImagePreview,
  fileInputRef,
  onEnunciadoChange,
  onAlternativaChange,
  onRespostaCorretaChange,
  onExplicacaoChange,
  onOrdemChange,
  onImageUpload,
  onRemoveImage,
  onToggleImagePreview,
  onSave,
  onCancel
}: QuestionFormProps) {
  const LABELS = ['A', 'B', 'C', 'D']

  return (
    <div className="p-4 space-y-5 bg-background/50">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">
          {isNew ? 'Nova Questão' : 'Editando Questão'}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${
              saveStatus === 'success'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveStatus === 'success' ? (
              <Check className="w-4 h-4" />
            ) : saveStatus === 'error' ? (
              <X className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : saveStatus === 'error' ? 'Erro' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Ordem */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Ordem / Número da questão</label>
        <input
          type="number"
          min={1}
          value={question.ordem || ''}
          onChange={(e) => onOrdemChange(Number(e.target.value))}
          className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {/* Enunciado */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Enunciado <span className="text-destructive">*</span>
        </label>
        <textarea
          value={question.enunciado}
          onChange={(e) => onEnunciadoChange(e.target.value)}
          rows={3}
          placeholder="Digite o enunciado da questão..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
        />
      </div>

      {/* Imagem (opcional) */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Imagem da Questão
          <span className="text-xs font-normal text-muted-foreground">(opcional — máx. 500KB)</span>
        </label>

        {question.imagemBase64 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleImagePreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {showImagePreview ? (
                  <><EyeOff className="w-3.5 h-3.5" /> Ocultar preview</>
                ) : (
                  <><Eye className="w-3.5 h-3.5" /> Ver imagem</>
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Trocar imagem
              </button>
              <button
                onClick={onRemoveImage}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            </div>

            {showImagePreview && (
              <div className="rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.imagemBase64}
                  alt="Preview da imagem"
                  className="max-h-48 w-full object-contain bg-secondary"
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              Selecionar imagem (PNG, JPG, WEBP — máx. 500KB)
            </button>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              A imagem é salva diretamente no Firestore (sem uso de Storage).
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={onImageUpload}
          className="hidden"
        />
      </div>

      {/* Alternativas */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Alternativas <span className="text-destructive">*</span>
          <span className="text-xs font-normal text-muted-foreground ml-2">
            — clique no círculo para marcar a correta
          </span>
        </label>
        <div className="space-y-2">
          {question.alternativas.map((alt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => onRespostaCorretaChange(i)}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  question.respostaCorreta === i
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-border bg-background hover:border-green-400'
                }`}
                title={`Marcar ${LABELS[i]} como correta`}
              >
                {question.respostaCorreta === i && <Check className="w-3.5 h-3.5" />}
              </button>
              <span className="font-bold text-sm text-muted-foreground w-4">{LABELS[i]}</span>
              <input
                type="text"
                value={alt}
                onChange={(e) => onAlternativaChange(i, e.target.value)}
                placeholder={`Alternativa ${LABELS[i]}...`}
                className={`flex-1 px-3 py-2 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
                  question.respostaCorreta === i ? 'border-green-500/50' : 'border-border'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Explicação */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Explicação / Feedback
          <span className="text-xs font-normal text-muted-foreground ml-2">(opcional)</span>
        </label>
        <textarea
          value={question.explicacao}
          onChange={(e) => onExplicacaoChange(e.target.value)}
          rows={2}
          placeholder="Explique o porquê da resposta correta (exibida após o aluno responder)..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
        />
      </div>
    </div>
  )
}
