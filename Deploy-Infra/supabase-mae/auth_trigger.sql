-- Trigger auth.users → public.usuarios (cadastro)
-- Rode DEPOIS de schema.sql em projetos Supabase novos.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
