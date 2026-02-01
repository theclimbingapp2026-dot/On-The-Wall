-- Follows table to track relationships between users
CREATE TABLE public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users NOT NULL,
  following_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- RLS Policies
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Everyone can see follow relationships (needed to show counts and button states)
CREATE POLICY "Follows are viewable by everyone" 
ON public.follows 
FOR SELECT 
USING (true);

-- Authenticated users can follow others
CREATE POLICY "Users can follow others" 
ON public.follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

-- Authenticated users can unfollow others
CREATE POLICY "Users can unfollow" 
ON public.follows 
FOR DELETE 
USING (auth.uid() = follower_id);
