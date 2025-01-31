-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS public.tickets (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    user_email TEXT NOT NULL,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assignee TEXT[] DEFAULT ARRAY[]::TEXT[],
    responses JSONB[] DEFAULT ARRAY[]::JSONB[],
    related_uuids TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE IF NOT EXISTS public.knowledge_files (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_content TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    widget_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.ticket_relationships (
    id SERIAL PRIMARY KEY,
    uuid_1 UUID NOT NULL,
    uuid_2 UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    UNIQUE(uuid_1, uuid_2)
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'agent')),
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_email ON public.tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_tickets_uuid ON public.tickets(uuid);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_filename ON public.knowledge_files(filename);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function to get user email
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Set up Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tickets"
    ON public.tickets FOR SELECT
    USING (auth.uid()::text = user_email OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent'));

CREATE POLICY "Users can create their own tickets"
    ON public.tickets FOR INSERT
    WITH CHECK (auth.uid()::text = user_email);

CREATE POLICY "Users can update their own tickets"
    ON public.tickets FOR UPDATE
    USING (auth.uid()::text = user_email OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent'));

CREATE POLICY "Agents can view all knowledge files"
    ON public.knowledge_files FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent'));

CREATE POLICY "Agents can manage knowledge files"
    ON public.knowledge_files FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent'));

CREATE POLICY "Users can view their own widgets"
    ON public.dashboard_widgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own widgets"
    ON public.dashboard_widgets FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own profiles"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profiles"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view ticket relationships"
    ON public.ticket_relationships FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE (t.uuid = uuid_1 OR t.uuid = uuid_2)
        AND (t.user_email = auth.uid()::text OR 
             EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'agent'))
    )); 