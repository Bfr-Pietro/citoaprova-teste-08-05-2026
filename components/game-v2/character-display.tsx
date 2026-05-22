'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CharacterData, CharacterEmotion } from '@/lib/firebase/firestore-service'

interface CharacterDisplayProps {
  character: CharacterData | null
  emotion: CharacterEmotion
  position: 'left' | 'center' | 'right'
  isActive?: boolean
  className?: string
}

// Fallback colors for characters without images
const CHARACTER_FALLBACK_COLORS: Record<string, string> = {
  detetive: 'from-blue-500 to-blue-700',
  drCell: 'from-emerald-500 to-emerald-700',
  fragmentado: 'from-purple-600 to-purple-900'
}

// Fallback icons for characters
const CHARACTER_FALLBACK_ICONS: Record<string, string> = {
  detetive: 'magnifying-glass',
  drCell: 'flask',
  fragmentado: 'skull'
}

export function CharacterDisplay({
  character,
  emotion,
  position,
  isActive = true,
  className
}: CharacterDisplayProps) {
  const [imageError, setImageError] = useState(false)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)

  // Get the appropriate image URL for the emotion
  useEffect(() => {
    if (!character) {
      setCurrentImageUrl(null)
      return
    }

    // Try to get image for specific emotion, fallback to neutral
    const emotionImage = character.images?.[emotion]
    const neutralImage = character.images?.neutral
    
    setCurrentImageUrl(emotionImage || neutralImage || null)
    setImageError(false)
  }, [character, emotion])

  if (!character) return null

  const positionClasses = {
    left: 'left-4 sm:left-8 lg:left-16',
    center: 'left-1/2 -translate-x-1/2',
    right: 'right-4 sm:right-8 lg:right-16'
  }

  const hasImage = currentImageUrl && !imageError

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${character.id}-${emotion}`}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ 
          opacity: isActive ? 1 : 0.4, 
          y: 0, 
          scale: isActive ? 1 : 0.9 
        }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.4, 0, 0.2, 1] 
        }}
        className={cn(
          'absolute bottom-0',
          positionClasses[position],
          'w-32 h-48 sm:w-40 sm:h-60 md:w-48 md:h-72 lg:w-56 lg:h-80',
          'pointer-events-none select-none',
          className
        )}
      >
        {hasImage ? (
          <div className="relative w-full h-full">
            <Image
              src={currentImageUrl}
              alt={character.name}
              fill
              className="object-contain object-bottom"
              onError={() => setImageError(true)}
              priority
            />
            {/* Emotion indicator */}
            <motion.div
              key={emotion}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 px-2 py-1 rounded-full bg-background/90 border border-border text-xs font-medium capitalize shadow-lg"
            >
              {emotion}
            </motion.div>
          </div>
        ) : (
          // Fallback: stylized placeholder
          <div 
            className={cn(
              'relative w-full h-full rounded-t-full',
              'bg-gradient-to-b',
              CHARACTER_FALLBACK_COLORS[character.id] || 'from-gray-500 to-gray-700',
              'flex flex-col items-center justify-center',
              'border-2 border-white/20 shadow-2xl'
            )}
          >
            {/* Character silhouette icon */}
            <div className="text-4xl sm:text-5xl md:text-6xl text-white/80 mb-2">
              {character.id === 'detetive' && '🔍'}
              {character.id === 'drCell' && '🔬'}
              {character.id === 'fragmentado' && '💀'}
            </div>
            
            {/* Character name */}
            <span className="text-xs sm:text-sm font-bold text-white/90 text-center px-2">
              {character.name}
            </span>
            
            {/* Emotion indicator */}
            <motion.div
              key={emotion}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 px-2 py-1 rounded-full bg-background/90 border border-border text-xs font-medium capitalize shadow-lg"
            >
              {emotion}
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Hook to manage character states in a scene
export function useCharacterScene() {
  const [characters, setCharacters] = useState<{
    left?: { data: CharacterData; emotion: CharacterEmotion }
    center?: { data: CharacterData; emotion: CharacterEmotion }
    right?: { data: CharacterData; emotion: CharacterEmotion }
  }>({})
  
  const [activePosition, setActivePosition] = useState<'left' | 'center' | 'right' | null>(null)

  const showCharacter = (
    position: 'left' | 'center' | 'right',
    character: CharacterData,
    emotion: CharacterEmotion = 'neutral'
  ) => {
    setCharacters(prev => ({
      ...prev,
      [position]: { data: character, emotion }
    }))
    setActivePosition(position)
  }

  const hideCharacter = (position: 'left' | 'center' | 'right') => {
    setCharacters(prev => {
      const next = { ...prev }
      delete next[position]
      return next
    })
  }

  const updateEmotion = (
    position: 'left' | 'center' | 'right',
    emotion: CharacterEmotion
  ) => {
    setCharacters(prev => {
      if (!prev[position]) return prev
      return {
        ...prev,
        [position]: { ...prev[position]!, emotion }
      }
    })
  }

  const clearAll = () => {
    setCharacters({})
    setActivePosition(null)
  }

  return {
    characters,
    activePosition,
    showCharacter,
    hideCharacter,
    updateEmotion,
    clearAll,
    setActivePosition
  }
}
