-- =============================================================================
-- Migration: controlled_card_code_rotation
-- Purpose:   Stage a replacement hardware card code without invalidating the
--            currently encoded physical credential. Finalization swaps the
--            live code only after the physical NFC/QR payload is verified.
-- =============================================================================

ALTER TABLE public.hardware_cards
  ADD COLUMN pending_card_code TEXT,
  ADD COLUMN pending_card_code_created_at TIMESTAMPTZ;

CREATE UNIQUE INDEX hardware_cards_pending_card_code_key
  ON public.hardware_cards (pending_card_code)
  WHERE pending_card_code IS NOT NULL;
