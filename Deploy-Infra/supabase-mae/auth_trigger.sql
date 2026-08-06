-- Trigger auth.users → public.usuarios (cadastro)
-- Rode DEPOIS de schema.sql em projetos Supabase novos.
-- O pg_dump do schema public NÃO inclui triggers do schema auth.

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
