# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository contains two HTML5 browser-based games:

1. **Solitaire** (`solitaire/`) - Klondike solitaire with drag-and-drop card movement
2. **Breakout** (`breakout.html`) - A breakout/block-breaking game using Canvas

## Solitaire Game

**Location:** `solitaire/` directory

**Files:**
- `index.html` - Game structure and layout
- `styles.css` - Green-themed styling with card designs
- `game.js` - Game logic and mechanics

**Architecture:**
- `Card` class: Represents individual cards with suit, rank, and face-up state
- `SolitaireGame` class: Manages the game state (deck, stock, waste, foundations, tableau)
- **Foundations:** 4 piles (♥♦♣♠) where cards are built A→K by suit
- **Tableau:** 7 columns where cards are built K→A by alternating colors
- **Stock/Waste:** Draw pile and revealed pile

**Key mechanics:**
- Drag-and-drop using mousedown/mousemove/mouseup events
- Cards can be moved from waste or tableau to foundations or other tableau columns
- Win condition: all 52 cards in foundations

**Build/Run:** Open `index.html` in a browser

## Breakout Game

**Location:** `breakout.html` (single file)

**Architecture:**
- Canvas-based rendering with `requestAnimationFrame` game loop
- Paddle controlled by mouse or arrow keys
- Ball physics with collision detection against blocks and paddle
- Score tracking and lives system

**Build/Run:** Open `breakout.html` in a browser

## Development

No build tools required. Both games are pure HTML/CSS/JavaScript and run directly in browsers.
