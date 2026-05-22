'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { 
  User, 
  Upload, 
  Save, 
  Trash2, 
  RefreshCw, 
  Check, 
  X,
  ImageIcon,
  Smile,
  Angry,
  HelpCircle,
  Frown,
  Skull,
  Zap
} from 'lucide-react'
import { 
  getCharacters, 
  saveCharacter, 
  type CharacterData, 
  type CharacterEmotion,
  DEFAULT_CHARACTERS
} from '@/lib/firebase/firestore-service'

interface CharacterManagerProps {
  adminUid: string
  adminEmail: string | null
}

const EMOTIONS: { key: CharacterEmotion; label: string; icon: React.ReactNode }[] = [
  { key: 'neutral', label: 'Neutro', icon: <User className="w-4 h-4" /> },
  { key: 'happy', label: 'Feliz', icon: <Smile className="w-4 h-4" /> },
  { key: 'angry', label: 'Raiva', icon: <Angry className="w-4 h-4" /> },
  { key: 'surprised', label: 'Surpreso', icon: <HelpCircle className="w-4 h-4" /> },
  { key: 'thinking', label: 'Pensativo', icon: <HelpCircle className="w-4 h-4" /> },
  { key: 'worried', label: 'Preocupado', icon: <Frown className="w-4 h-4" /> },
  { key: 'evil', label: 'Malvado', icon: <Skull className="w-4 h-4" /> },
  { key: 'determined', label: 'Determinado', icon: <Zap className="w-4 h-4" /> },
]

const CHARACTER_COLORS: Record<string, string> = {
  detetive: 'from-blue-500 to-blue-700',
  drCell: 'from-emerald-500 to-emerald-700',
  fragmentado: 'from-purple-600 to-purple-900',
}

export default function CharacterManager({ adminUid, adminEmail }: CharacterManagerProps) {
  const [characters, setCharacters] = useState<CharacterData[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null)
  const [selectedEmotion, setSelectedEmotion] = useState<CharacterEmotion>('neutral')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [imageUrls, setImageUrls] = useState<Record<string, Record<CharacterEmotion, string>>>({})

  // Load characters
  const loadCharacters = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getCharacters()
      setCharacters(data)
      
      // Initialize image URLs from loaded data
      const urls: Record<string, Record<CharacterEmotion, string>> = {}
      data.forEach(char => {
        urls[char.id] = { ...char.images } as Record<CharacterEmotion, string>
      })
      setImageUrls(urls)
    } catch (error) {
      console.error('Error loading characters:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  // Handle image URL change
  const handleImageUrlChange = (characterId: string, emotion: CharacterEmotion, url: string) => {
    setImageUrls(prev => ({
      ...prev,
      [characterId]: {
        ...prev[characterId],
        [emotion]: url
      }
    }))
  }

  // Save character
  const handleSaveCharacter = async (characterId: string) => {
    setIsSaving(true)
    setSaveStatus('idle')
    
    try {
      const character = characters.find(c => c.id === characterId)
      if (!character) return

      const updatedCharacter: CharacterData = {
        ...character,
        images: imageUrls[characterId] || {}
      }

      const success = await saveCharacter(adminUid, adminEmail, updatedCharacter)
      
      if (success) {
        setSaveStatus('success')
        // Reload to confirm save
        await loadCharacters()
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Error saving character:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Clear image
  const handleClearImage = (characterId: string, emotion: CharacterEmotion) => {
    setImageUrls(prev => ({
      ...prev,
      [characterId]: {
        ...prev[characterId],
        [emotion]: ''
      }
    }))
  }

  const currentCharacter = characters.find(c => c.id === selectedCharacter)
  const currentImageUrl = selectedCharacter ? imageUrls[selectedCharacter]?.[selectedEmotion] || '' : ''

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Character Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {characters.map(character => (
          <button
            key={character.id}
            onClick={() => setSelectedCharacter(character.id)}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedCharacter === character.id
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${CHARACTER_COLORS[character.id]} flex items-center justify-center mb-3`}>
              <span className="text-2xl text-white">
                {character.id === 'detetive' && '🔍'}
                {character.id === 'drCell' && '🔬'}
                {character.id === 'fragmentado' && '💀'}
              </span>
            </div>
            <h3 className="font-bold text-foreground text-center">{character.name}</h3>
            <p className="text-xs text-muted-foreground text-center mt-1">{character.description}</p>
            
            {/* Image count indicator */}
            <div className="mt-3 flex items-center justify-center gap-1">
              <ImageIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {Object.values(imageUrls[character.id] || {}).filter(Boolean).length}/8 imagens
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Character Editor */}
      {selectedCharacter && currentCharacter && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground">Editar: {currentCharacter.name}</h3>
              <p className="text-sm text-muted-foreground">Configure as imagens para cada emocao</p>
            </div>
            <button
              onClick={() => handleSaveCharacter(selectedCharacter)}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
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

          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Emotion Selection */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Emocoes</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EMOTIONS.map(emotion => (
                  <button
                    key={emotion.key}
                    onClick={() => setSelectedEmotion(emotion.key)}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                      selectedEmotion === emotion.key
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    {emotion.icon}
                    <span className="text-xs font-medium">{emotion.label}</span>
                    {imageUrls[selectedCharacter]?.[emotion.key] && (
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Image URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  URL da Imagem ({EMOTIONS.find(e => e.key === selectedEmotion)?.label})
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={currentImageUrl}
                    onChange={(e) => handleImageUrlChange(selectedCharacter, selectedEmotion, e.target.value)}
                    placeholder="https://exemplo.com/imagem.png"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {currentImageUrl && (
                    <button
                      onClick={() => handleClearImage(selectedCharacter, selectedEmotion)}
                      className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cole a URL de uma imagem PNG ou JPG. Recomendado: 512x768px ou proporcao similar.
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Preview</h4>
              <div className="relative h-80 bg-gradient-to-b from-secondary to-background rounded-xl border border-border overflow-hidden">
                {currentImageUrl ? (
                  <div className="relative w-full h-full flex items-end justify-center">
                    <div className="relative w-48 h-64">
                      <Image
                        src={currentImageUrl}
                        alt={`${currentCharacter.name} - ${selectedEmotion}`}
                        fill
                        className="object-contain object-bottom"
                        onError={(e) => {
                          // Handle error - could show fallback
                          console.error('Image load error')
                        }}
                      />
                    </div>
                    {/* Emotion badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-background/90 rounded-full border border-border">
                      <span className="text-sm font-medium capitalize">{selectedEmotion}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${CHARACTER_COLORS[selectedCharacter]} flex items-center justify-center mb-4`}>
                      <span className="text-4xl">
                        {selectedCharacter === 'detetive' && '🔍'}
                        {selectedCharacter === 'drCell' && '🔬'}
                        {selectedCharacter === 'fragmentado' && '💀'}
                      </span>
                    </div>
                    <p className="text-sm">Nenhuma imagem definida</p>
                    <p className="text-xs">Cole uma URL acima para visualizar</p>
                  </div>
                )}
              </div>

              {/* All emotions preview */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-muted-foreground">Todas as emocoes</h5>
                <div className="flex flex-wrap gap-2">
                  {EMOTIONS.map(emotion => {
                    const imgUrl = imageUrls[selectedCharacter]?.[emotion.key]
                    return (
                      <button
                        key={emotion.key}
                        onClick={() => setSelectedEmotion(emotion.key)}
                        className={`w-12 h-12 rounded-lg border overflow-hidden ${
                          selectedEmotion === emotion.key ? 'ring-2 ring-primary' : ''
                        } ${imgUrl ? 'border-border' : 'border-dashed border-muted-foreground/30'}`}
                        title={emotion.label}
                      >
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={emotion.label}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            {emotion.icon}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedCharacter && (
        <div className="bg-secondary/50 rounded-xl p-6 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-bold text-foreground mb-2">Selecione um Personagem</h3>
          <p className="text-sm text-muted-foreground">
            Escolha um dos personagens acima para configurar suas imagens para cada emocao.
            As imagens serao usadas no sistema de visual novel do jogo.
          </p>
        </div>
      )}
    </div>
  )
}
