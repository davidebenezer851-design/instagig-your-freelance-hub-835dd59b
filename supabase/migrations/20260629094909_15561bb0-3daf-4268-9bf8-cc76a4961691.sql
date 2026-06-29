
-- Add theme preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light'));

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update their own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert notifications they trigger" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR auth.uid() = user_id);
CREATE POLICY "Users delete their own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, read, created_at DESC);

-- Trigger: on new message, notify the other party
CREATE OR REPLACE FUNCTION public.tg_message_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient uuid;
  sender_name text;
BEGIN
  SELECT CASE WHEN c.user_a = NEW.sender_id THEN c.user_b ELSE c.user_a END
    INTO recipient
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF recipient IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, 'Someone') INTO sender_name
  FROM public.profiles WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link)
  VALUES (
    recipient, NEW.sender_id, 'message',
    sender_name || ' sent you a message',
    COALESCE(LEFT(NEW.body, 120), '📎 Attachment'),
    '/messages?c=' || NEW.conversation_id::text
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_message_notify ON public.messages;
CREATE TRIGGER trg_message_notify AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_message_notify();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
