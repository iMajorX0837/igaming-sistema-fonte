-- Privilégios extraídos da Supabase mãe (public)
-- Rode no SQL Editor do projeto novo/casa existente após schema parcial
-- Gerado automaticamente por export-mae

GRANT USAGE ON SCHEMA public TO postgres;

GRANT USAGE ON SCHEMA public TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT USAGE ON SCHEMA public TO service_role;



--
-- Name: FUNCTION _admin_cms_secao_label(p_secao text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._admin_cms_secao_label(p_secao text) TO anon;

GRANT ALL ON FUNCTION public._admin_cms_secao_label(p_secao text) TO authenticated;

GRANT ALL ON FUNCTION public._admin_cms_secao_label(p_secao text) TO service_role;



--
-- Name: FUNCTION _admin_table_categoria(p_table text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._admin_table_categoria(p_table text) TO anon;

GRANT ALL ON FUNCTION public._admin_table_categoria(p_table text) TO authenticated;

GRANT ALL ON FUNCTION public._admin_table_categoria(p_table text) TO service_role;



--
-- Name: FUNCTION _admin_table_label(p_table text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._admin_table_label(p_table text) TO anon;

GRANT ALL ON FUNCTION public._admin_table_label(p_table text) TO authenticated;

GRANT ALL ON FUNCTION public._admin_table_label(p_table text) TO service_role;



--
-- Name: FUNCTION _assert_referral_code_caller(p_referral_code text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._assert_referral_code_caller(p_referral_code text) FROM PUBLIC;

GRANT ALL ON FUNCTION public._assert_referral_code_caller(p_referral_code text) TO service_role;



--
-- Name: FUNCTION _aviator_bet_txn_id(p_txn_id text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._aviator_bet_txn_id(p_txn_id text) TO anon;

GRANT ALL ON FUNCTION public._aviator_bet_txn_id(p_txn_id text) TO authenticated;

GRANT ALL ON FUNCTION public._aviator_bet_txn_id(p_txn_id text) TO service_role;



--
-- Name: FUNCTION _aviator_com_bonus_eh_sim(p_com_bonus text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._aviator_com_bonus_eh_sim(p_com_bonus text) TO anon;

GRANT ALL ON FUNCTION public._aviator_com_bonus_eh_sim(p_com_bonus text) TO authenticated;

GRANT ALL ON FUNCTION public._aviator_com_bonus_eh_sim(p_com_bonus text) TO service_role;



--
-- Name: FUNCTION _aviator_resolve_usuario(p_email text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public._aviator_resolve_usuario(p_email text) FROM PUBLIC;

GRANT ALL ON FUNCTION public._aviator_resolve_usuario(p_email text) TO service_role;



--
-- Name: FUNCTION _aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_usa_bonus_forcado boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_usa_bonus_forcado boolean) TO anon;

GRANT ALL ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_usa_bonus_forcado boolean) TO authenticated;

GRANT ALL ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_usa_bonus_forcado boolean) TO service_role;



--
-- Name: FUNCTION _aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text) TO anon;

GRANT ALL ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text) TO authenticated;

GRANT ALL ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text) TO service_role;



--
-- Name: TABLE cupons; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cupons TO anon;

GRANT ALL ON TABLE public.cupons TO authenticated;

GRANT ALL ON TABLE public.cupons TO service_role;



--
-- Name: FUNCTION _buscar_cupom_ativo(p_codigo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._buscar_cupom_ativo(p_codigo text) TO anon;

GRANT ALL ON FUNCTION public._buscar_cupom_ativo(p_codigo text) TO authenticated;

GRANT ALL ON FUNCTION public._buscar_cupom_ativo(p_codigo text) TO service_role;



--
-- Name: FUNCTION _calcular_bonus_cupom(p_tipo_valor text, p_valor numeric, p_bonus_maximo numeric, p_valor_deposito numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._calcular_bonus_cupom(p_tipo_valor text, p_valor numeric, p_bonus_maximo numeric, p_valor_deposito numeric) TO anon;

GRANT ALL ON FUNCTION public._calcular_bonus_cupom(p_tipo_valor text, p_valor numeric, p_bonus_maximo numeric, p_valor_deposito numeric) TO authenticated;

GRANT ALL ON FUNCTION public._calcular_bonus_cupom(p_tipo_valor text, p_valor numeric, p_bonus_maximo numeric, p_valor_deposito numeric) TO service_role;



--
-- Name: FUNCTION _carteira_usa_bonus(p_carteira text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._carteira_usa_bonus(p_carteira text) TO anon;

GRANT ALL ON FUNCTION public._carteira_usa_bonus(p_carteira text) TO authenticated;

GRANT ALL ON FUNCTION public._carteira_usa_bonus(p_carteira text) TO service_role;



--
-- Name: FUNCTION _conceder_giros_gratis(p_cupom public.cupons, p_usuario_id uuid, p_deposito_id uuid, p_valor_deposito numeric, p_origem text, p_status_giro text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._conceder_giros_gratis(p_cupom public.cupons, p_usuario_id uuid, p_deposito_id uuid, p_valor_deposito numeric, p_origem text, p_status_giro text) TO anon;

GRANT ALL ON FUNCTION public._conceder_giros_gratis(p_cupom public.cupons, p_usuario_id uuid, p_deposito_id uuid, p_valor_deposito numeric, p_origem text, p_status_giro text) TO authenticated;

GRANT ALL ON FUNCTION public._conceder_giros_gratis(p_cupom public.cupons, p_usuario_id uuid, p_deposito_id uuid, p_valor_deposito numeric, p_origem text, p_status_giro text) TO service_role;



--
-- Name: FUNCTION _depositos_periodo_range(p_periodo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._depositos_periodo_range(p_periodo text) TO anon;

GRANT ALL ON FUNCTION public._depositos_periodo_range(p_periodo text) TO authenticated;

GRANT ALL ON FUNCTION public._depositos_periodo_range(p_periodo text) TO service_role;



--
-- Name: FUNCTION _ganho_eh_de_giros_gratis(p_usuario_id uuid, p_bet numeric, p_win numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._ganho_eh_de_giros_gratis(p_usuario_id uuid, p_bet numeric, p_win numeric) TO anon;

GRANT ALL ON FUNCTION public._ganho_eh_de_giros_gratis(p_usuario_id uuid, p_bet numeric, p_win numeric) TO authenticated;

GRANT ALL ON FUNCTION public._ganho_eh_de_giros_gratis(p_usuario_id uuid, p_bet numeric, p_win numeric) TO service_role;



--
-- Name: FUNCTION _jogo_giros_permitido(p_slug text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._jogo_giros_permitido(p_slug text) TO anon;

GRANT ALL ON FUNCTION public._jogo_giros_permitido(p_slug text) TO authenticated;

GRANT ALL ON FUNCTION public._jogo_giros_permitido(p_slug text) TO service_role;



--
-- Name: FUNCTION _request_header(p_name text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._request_header(p_name text) TO anon;

GRANT ALL ON FUNCTION public._request_header(p_name text) TO authenticated;

GRANT ALL ON FUNCTION public._request_header(p_name text) TO service_role;



--
-- Name: FUNCTION _saldo_jogavel_carteira(p_saldo numeric, p_saldo_bonus numeric, p_carteira text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._saldo_jogavel_carteira(p_saldo numeric, p_saldo_bonus numeric, p_carteira text) TO anon;

GRANT ALL ON FUNCTION public._saldo_jogavel_carteira(p_saldo numeric, p_saldo_bonus numeric, p_carteira text) TO authenticated;

GRANT ALL ON FUNCTION public._saldo_jogavel_carteira(p_saldo numeric, p_saldo_bonus numeric, p_carteira text) TO service_role;



--
-- Name: FUNCTION _validar_cupom_giros(p_cupom public.cupons); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._validar_cupom_giros(p_cupom public.cupons) TO anon;

GRANT ALL ON FUNCTION public._validar_cupom_giros(p_cupom public.cupons) TO authenticated;

GRANT ALL ON FUNCTION public._validar_cupom_giros(p_cupom public.cupons) TO service_role;



--
-- Name: FUNCTION _validar_limites_cupom(p_cupom public.cupons, p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public._validar_limites_cupom(p_cupom public.cupons, p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public._validar_limites_cupom(p_cupom public.cupons, p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public._validar_limites_cupom(p_cupom public.cupons, p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION abater_rollover_aposta(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.abater_rollover_aposta() TO anon;

GRANT ALL ON FUNCTION public.abater_rollover_aposta() TO authenticated;

GRANT ALL ON FUNCTION public.abater_rollover_aposta() TO service_role;



--
-- Name: FUNCTION adicionar_membro_equipe(p_email text, p_cargo text, p_nome text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.adicionar_membro_equipe(p_email text, p_cargo text, p_nome text) TO anon;

GRANT ALL ON FUNCTION public.adicionar_membro_equipe(p_email text, p_cargo text, p_nome text) TO authenticated;

GRANT ALL ON FUNCTION public.adicionar_membro_equipe(p_email text, p_cargo text, p_nome text) TO service_role;



--
-- Name: FUNCTION aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text) TO anon;

GRANT ALL ON FUNCTION public.aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text) TO authenticated;

GRANT ALL ON FUNCTION public.aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text) TO service_role;



--
-- Name: FUNCTION aplicar_rollover_bonus_giro(p_usuario_id uuid, p_valor numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.aplicar_rollover_bonus_giro(p_usuario_id uuid, p_valor numeric) TO anon;

GRANT ALL ON FUNCTION public.aplicar_rollover_bonus_giro(p_usuario_id uuid, p_valor numeric) TO authenticated;

GRANT ALL ON FUNCTION public.aplicar_rollover_bonus_giro(p_usuario_id uuid, p_valor numeric) TO service_role;



--
-- Name: FUNCTION aplicar_rollover_deposito(p_usuario_id uuid, p_valor numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.aplicar_rollover_deposito(p_usuario_id uuid, p_valor numeric) TO anon;

GRANT ALL ON FUNCTION public.aplicar_rollover_deposito(p_usuario_id uuid, p_valor numeric) TO authenticated;

GRANT ALL ON FUNCTION public.aplicar_rollover_deposito(p_usuario_id uuid, p_valor numeric) TO service_role;



--
-- Name: FUNCTION aplicar_rollover_usuario_admin(p_usuario_id uuid, p_valor numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.aplicar_rollover_usuario_admin(p_usuario_id uuid, p_valor numeric) TO anon;

GRANT ALL ON FUNCTION public.aplicar_rollover_usuario_admin(p_usuario_id uuid, p_valor numeric) TO authenticated;

GRANT ALL ON FUNCTION public.aplicar_rollover_usuario_admin(p_usuario_id uuid, p_valor numeric) TO service_role;



--
-- Name: FUNCTION ativar_cupom(p_codigo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ativar_cupom(p_codigo text) TO anon;

GRANT ALL ON FUNCTION public.ativar_cupom(p_codigo text) TO authenticated;

GRANT ALL ON FUNCTION public.ativar_cupom(p_codigo text) TO service_role;



--
-- Name: FUNCTION atualizar_aviator_config_admin(p_modo_geracao text, p_rtp_geral numeric, p_pct_vela_azul numeric, p_pct_vela_roxa numeric, p_pct_vela_rosa numeric, p_geracao_min_crash numeric, p_geracao_max_crash numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_aviator_config_admin(p_modo_geracao text, p_rtp_geral numeric, p_pct_vela_azul numeric, p_pct_vela_roxa numeric, p_pct_vela_rosa numeric, p_geracao_min_crash numeric, p_geracao_max_crash numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer) TO anon;

GRANT ALL ON FUNCTION public.atualizar_aviator_config_admin(p_modo_geracao text, p_rtp_geral numeric, p_pct_vela_azul numeric, p_pct_vela_roxa numeric, p_pct_vela_rosa numeric, p_geracao_min_crash numeric, p_geracao_max_crash numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_aviator_config_admin(p_modo_geracao text, p_rtp_geral numeric, p_pct_vela_azul numeric, p_pct_vela_roxa numeric, p_pct_vela_rosa numeric, p_geracao_min_crash numeric, p_geracao_max_crash numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer) TO service_role;



--
-- Name: FUNCTION atualizar_aviator_config_admin(p_rtp_base numeric, p_rtp_min numeric, p_rtp_max numeric, p_recovery_enabled boolean, p_recovery_window_hours integer, p_ggr_target_pct numeric, p_recovery_strength numeric, p_recovery_max_adjustment numeric, p_min_wagered_for_recovery numeric, p_recovery_loss_trigger_brl numeric, p_recovery_profit_trigger_brl numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_aviator_config_admin(p_rtp_base numeric, p_rtp_min numeric, p_rtp_max numeric, p_recovery_enabled boolean, p_recovery_window_hours integer, p_ggr_target_pct numeric, p_recovery_strength numeric, p_recovery_max_adjustment numeric, p_min_wagered_for_recovery numeric, p_recovery_loss_trigger_brl numeric, p_recovery_profit_trigger_brl numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer) TO anon;

GRANT ALL ON FUNCTION public.atualizar_aviator_config_admin(p_rtp_base numeric, p_rtp_min numeric, p_rtp_max numeric, p_recovery_enabled boolean, p_recovery_window_hours integer, p_ggr_target_pct numeric, p_recovery_strength numeric, p_recovery_max_adjustment numeric, p_min_wagered_for_recovery numeric, p_recovery_loss_trigger_brl numeric, p_recovery_profit_trigger_brl numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_aviator_config_admin(p_rtp_base numeric, p_rtp_min numeric, p_rtp_max numeric, p_recovery_enabled boolean, p_recovery_window_hours integer, p_ggr_target_pct numeric, p_recovery_strength numeric, p_recovery_max_adjustment numeric, p_min_wagered_for_recovery numeric, p_recovery_loss_trigger_brl numeric, p_recovery_profit_trigger_brl numeric, p_min_crash numeric, p_max_crash numeric, p_queue_size integer) TO service_role;



--
-- Name: FUNCTION atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric) TO anon;

GRANT ALL ON FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric) TO service_role;



--
-- Name: FUNCTION atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric, p_saques_diarios_permitidos integer, p_rollover_padrao numeric, p_rollover_giros_gratis numeric, p_indicacao_recompensa numeric, p_indicacao_deposito_minimo numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric, p_saques_diarios_permitidos integer, p_rollover_padrao numeric, p_rollover_giros_gratis numeric, p_indicacao_recompensa numeric, p_indicacao_deposito_minimo numeric) TO anon;

GRANT ALL ON FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric, p_saques_diarios_permitidos integer, p_rollover_padrao numeric, p_rollover_giros_gratis numeric, p_indicacao_recompensa numeric, p_indicacao_deposito_minimo numeric) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric, p_deposito_maximo numeric, p_saque_minimo numeric, p_saque_maximo numeric, p_saques_diarios_permitidos integer, p_rollover_padrao numeric, p_rollover_giros_gratis numeric, p_indicacao_recompensa numeric, p_indicacao_deposito_minimo numeric) TO service_role;



--
-- Name: FUNCTION atualizar_indicacao_usuario_admin(p_usuario_id uuid, p_usar_padrao_plataforma boolean, p_recompensa numeric, p_deposito_minimo numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_indicacao_usuario_admin(p_usuario_id uuid, p_usar_padrao_plataforma boolean, p_recompensa numeric, p_deposito_minimo numeric) TO anon;

GRANT ALL ON FUNCTION public.atualizar_indicacao_usuario_admin(p_usuario_id uuid, p_usar_padrao_plataforma boolean, p_recompensa numeric, p_deposito_minimo numeric) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_indicacao_usuario_admin(p_usuario_id uuid, p_usar_padrao_plataforma boolean, p_recompensa numeric, p_deposito_minimo numeric) TO service_role;



--
-- Name: FUNCTION atualizar_membro_equipe(p_usuario_id uuid, p_cargo text, p_ativo boolean, p_nome text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_membro_equipe(p_usuario_id uuid, p_cargo text, p_ativo boolean, p_nome text) TO anon;

GRANT ALL ON FUNCTION public.atualizar_membro_equipe(p_usuario_id uuid, p_cargo text, p_ativo boolean, p_nome text) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_membro_equipe(p_usuario_id uuid, p_cargo text, p_ativo boolean, p_nome text) TO service_role;



--
-- Name: FUNCTION atualizar_perfil_usuario_admin(p_usuario_id uuid, p_nome text, p_email text, p_cpf text, p_telefone text, p_data_nascimento date, p_pais text, p_cargo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_perfil_usuario_admin(p_usuario_id uuid, p_nome text, p_email text, p_cpf text, p_telefone text, p_data_nascimento date, p_pais text, p_cargo text) TO anon;

GRANT ALL ON FUNCTION public.atualizar_perfil_usuario_admin(p_usuario_id uuid, p_nome text, p_email text, p_cpf text, p_telefone text, p_data_nascimento date, p_pais text, p_cargo text) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_perfil_usuario_admin(p_usuario_id uuid, p_nome text, p_email text, p_cpf text, p_telefone text, p_data_nascimento date, p_pais text, p_cargo text) TO service_role;



--
-- Name: FUNCTION atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric) TO anon;

GRANT ALL ON FUNCTION public.atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric) TO service_role;



--
-- Name: FUNCTION atualizar_status_deposito_admin(p_deposito_id uuid, p_status text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_status_deposito_admin(p_deposito_id uuid, p_status text) TO anon;

GRANT ALL ON FUNCTION public.atualizar_status_deposito_admin(p_deposito_id uuid, p_status text) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_status_deposito_admin(p_deposito_id uuid, p_status text) TO service_role;



--
-- Name: FUNCTION atualizar_status_saque_admin(p_saque_id uuid, p_status text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_status_saque_admin(p_saque_id uuid, p_status text) TO anon;

GRANT ALL ON FUNCTION public.atualizar_status_saque_admin(p_saque_id uuid, p_status text) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_status_saque_admin(p_saque_id uuid, p_status text) TO service_role;



--
-- Name: FUNCTION atualizar_status_usuario_admin(p_usuario_id uuid, p_ativo boolean, p_verificado boolean, p_kyc_status text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.atualizar_status_usuario_admin(p_usuario_id uuid, p_ativo boolean, p_verificado boolean, p_kyc_status text) TO anon;

GRANT ALL ON FUNCTION public.atualizar_status_usuario_admin(p_usuario_id uuid, p_ativo boolean, p_verificado boolean, p_kyc_status text) TO authenticated;

GRANT ALL ON FUNCTION public.atualizar_status_usuario_admin(p_usuario_id uuid, p_ativo boolean, p_verificado boolean, p_kyc_status text) TO service_role;



--
-- Name: FUNCTION aviator_creditar_saldo(p_email text, p_valor numeric, p_txn_id text, p_bet_valor numeric, p_tipo text, p_usa_bonus boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.aviator_creditar_saldo(p_email text, p_valor numeric, p_txn_id text, p_bet_valor numeric, p_tipo text, p_usa_bonus boolean) FROM PUBLIC;

GRANT ALL ON FUNCTION public.aviator_creditar_saldo(p_email text, p_valor numeric, p_txn_id text, p_bet_valor numeric, p_tipo text, p_usa_bonus boolean) TO service_role;



--
-- Name: FUNCTION aviator_debit_saldo(p_email text, p_valor numeric, p_txn_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.aviator_debit_saldo(p_email text, p_valor numeric, p_txn_id text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.aviator_debit_saldo(p_email text, p_valor numeric, p_txn_id text) TO service_role;



--
-- Name: FUNCTION aviator_reembolsar_saldo(p_email text, p_valor numeric, p_txn_id text, p_usa_bonus boolean); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.aviator_reembolsar_saldo(p_email text, p_valor numeric, p_txn_id text, p_usa_bonus boolean) FROM PUBLIC;

GRANT ALL ON FUNCTION public.aviator_reembolsar_saldo(p_email text, p_valor numeric, p_txn_id text, p_usa_bonus boolean) TO service_role;



--
-- Name: FUNCTION aviator_registrar_perda(p_email text, p_txn_id text, p_bet_valor numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.aviator_registrar_perda(p_email text, p_txn_id text, p_bet_valor numeric) FROM PUBLIC;

GRANT ALL ON FUNCTION public.aviator_registrar_perda(p_email text, p_txn_id text, p_bet_valor numeric) TO service_role;



--
-- Name: FUNCTION calcular_aviator_ggr(p_window_hours integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.calcular_aviator_ggr(p_window_hours integer) TO anon;

GRANT ALL ON FUNCTION public.calcular_aviator_ggr(p_window_hours integer) TO authenticated;

GRANT ALL ON FUNCTION public.calcular_aviator_ggr(p_window_hours integer) TO service_role;



--
-- Name: FUNCTION calcular_ganhos_indicacao(p_referral_code text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.calcular_ganhos_indicacao(p_referral_code text) TO anon;

GRANT ALL ON FUNCTION public.calcular_ganhos_indicacao(p_referral_code text) TO authenticated;

GRANT ALL ON FUNCTION public.calcular_ganhos_indicacao(p_referral_code text) TO service_role;



--
-- Name: FUNCTION calcular_vip_nivel(p_total_depositado numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.calcular_vip_nivel(p_total_depositado numeric) TO anon;

GRANT ALL ON FUNCTION public.calcular_vip_nivel(p_total_depositado numeric) TO authenticated;

GRANT ALL ON FUNCTION public.calcular_vip_nivel(p_total_depositado numeric) TO service_role;



--
-- Name: FUNCTION check_user_is_admin(user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.check_user_is_admin(user_id uuid) TO anon;

GRANT ALL ON FUNCTION public.check_user_is_admin(user_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.check_user_is_admin(user_id uuid) TO service_role;



--
-- Name: FUNCTION confirmar_deposito_pix_pago(p_deposito_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid) TO service_role;



--
-- Name: FUNCTION confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text) TO anon;

GRANT ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text) TO authenticated;

GRANT ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text) TO service_role;



--
-- Name: FUNCTION converter_bonus_saldo(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.converter_bonus_saldo() TO anon;

GRANT ALL ON FUNCTION public.converter_bonus_saldo() TO authenticated;

GRANT ALL ON FUNCTION public.converter_bonus_saldo() TO service_role;



--
-- Name: FUNCTION count_qualified_referrals(referral_code_param text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.count_qualified_referrals(referral_code_param text) TO anon;

GRANT ALL ON FUNCTION public.count_qualified_referrals(referral_code_param text) TO authenticated;

GRANT ALL ON FUNCTION public.count_qualified_referrals(referral_code_param text) TO service_role;



--
-- Name: FUNCTION definir_carteira_ativa(p_carteira text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.definir_carteira_ativa(p_carteira text) TO anon;

GRANT ALL ON FUNCTION public.definir_carteira_ativa(p_carteira text) TO authenticated;

GRANT ALL ON FUNCTION public.definir_carteira_ativa(p_carteira text) TO service_role;



--
-- Name: FUNCTION desativar_rollover_usuario_admin(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION generate_referral_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_referral_code() TO anon;

GRANT ALL ON FUNCTION public.generate_referral_code() TO authenticated;

GRANT ALL ON FUNCTION public.generate_referral_code() TO service_role;



--
-- Name: FUNCTION get_current_admin_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_current_admin_user() TO anon;

GRANT ALL ON FUNCTION public.get_current_admin_user() TO authenticated;

GRANT ALL ON FUNCTION public.get_current_admin_user() TO service_role;



--
-- Name: FUNCTION get_current_user_referral_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_current_user_referral_code() TO anon;

GRANT ALL ON FUNCTION public.get_current_user_referral_code() TO authenticated;

GRANT ALL ON FUNCTION public.get_current_user_referral_code() TO service_role;



--
-- Name: FUNCTION get_total_usuarios(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_total_usuarios() TO anon;

GRANT ALL ON FUNCTION public.get_total_usuarios() TO authenticated;

GRANT ALL ON FUNCTION public.get_total_usuarios() TO service_role;



--
-- Name: FUNCTION get_user_by_email(user_email text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_by_email(user_email text) TO anon;

GRANT ALL ON FUNCTION public.get_user_by_email(user_email text) TO authenticated;

GRANT ALL ON FUNCTION public.get_user_by_email(user_email text) TO service_role;



--
-- Name: FUNCTION get_user_cargo(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_user_cargo() TO anon;

GRANT ALL ON FUNCTION public.get_user_cargo() TO authenticated;

GRANT ALL ON FUNCTION public.get_user_cargo() TO service_role;



--
-- Name: FUNCTION girar_roleta(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.girar_roleta() TO anon;

GRANT ALL ON FUNCTION public.girar_roleta() TO authenticated;

GRANT ALL ON FUNCTION public.girar_roleta() TO service_role;



--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;



--
-- Name: FUNCTION handle_saque_rejeitado(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_saque_rejeitado() TO anon;

GRANT ALL ON FUNCTION public.handle_saque_rejeitado() TO authenticated;

GRANT ALL ON FUNCTION public.handle_saque_rejeitado() TO service_role;



--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;

GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;



--
-- Name: FUNCTION handle_updated_at_aviator_rounds(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at_aviator_rounds() TO anon;

GRANT ALL ON FUNCTION public.handle_updated_at_aviator_rounds() TO authenticated;

GRANT ALL ON FUNCTION public.handle_updated_at_aviator_rounds() TO service_role;



--
-- Name: FUNCTION handle_updated_at_depositos(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at_depositos() TO anon;

GRANT ALL ON FUNCTION public.handle_updated_at_depositos() TO authenticated;

GRANT ALL ON FUNCTION public.handle_updated_at_depositos() TO service_role;



--
-- Name: FUNCTION handle_updated_at_saques(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_updated_at_saques() TO anon;

GRANT ALL ON FUNCTION public.handle_updated_at_saques() TO authenticated;

GRANT ALL ON FUNCTION public.handle_updated_at_saques() TO service_role;



--
-- Name: FUNCTION insert_aviator_vela(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.insert_aviator_vela() TO anon;

GRANT ALL ON FUNCTION public.insert_aviator_vela() TO authenticated;

GRANT ALL ON FUNCTION public.insert_aviator_vela() TO service_role;



--
-- Name: FUNCTION is_user_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_user_admin() TO anon;

GRANT ALL ON FUNCTION public.is_user_admin() TO authenticated;

GRANT ALL ON FUNCTION public.is_user_admin() TO service_role;



--
-- Name: FUNCTION listar_cupons_usuario(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_cupons_usuario() TO anon;

GRANT ALL ON FUNCTION public.listar_cupons_usuario() TO authenticated;

GRANT ALL ON FUNCTION public.listar_cupons_usuario() TO service_role;



--
-- Name: FUNCTION listar_depositos_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_depositos_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer) TO anon;

GRANT ALL ON FUNCTION public.listar_depositos_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer) TO authenticated;

GRANT ALL ON FUNCTION public.listar_depositos_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer) TO service_role;



--
-- Name: FUNCTION listar_logs_admin(p_data_inicial date, p_data_final date, p_categoria text, p_status text, p_busca text, p_pagina integer, p_por_pagina integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_logs_admin(p_data_inicial date, p_data_final date, p_categoria text, p_status text, p_busca text, p_pagina integer, p_por_pagina integer) TO anon;

GRANT ALL ON FUNCTION public.listar_logs_admin(p_data_inicial date, p_data_final date, p_categoria text, p_status text, p_busca text, p_pagina integer, p_por_pagina integer) TO authenticated;

GRANT ALL ON FUNCTION public.listar_logs_admin(p_data_inicial date, p_data_final date, p_categoria text, p_status text, p_busca text, p_pagina integer, p_por_pagina integer) TO service_role;



--
-- Name: FUNCTION listar_membros_equipe(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_membros_equipe() TO anon;

GRANT ALL ON FUNCTION public.listar_membros_equipe() TO authenticated;

GRANT ALL ON FUNCTION public.listar_membros_equipe() TO service_role;



--
-- Name: FUNCTION listar_saques_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_saques_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer) TO anon;

GRANT ALL ON FUNCTION public.listar_saques_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer) TO authenticated;

GRANT ALL ON FUNCTION public.listar_saques_admin(p_status text, p_periodo text, p_busca text, p_pagina integer, p_por_pagina integer) TO service_role;



--
-- Name: FUNCTION listar_sessoes_usuario_admin(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_sessoes_usuario_admin(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.listar_sessoes_usuario_admin(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.listar_sessoes_usuario_admin(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION listar_transacoes_recentes_admin(p_limite integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_transacoes_recentes_admin(p_limite integer) TO anon;

GRANT ALL ON FUNCTION public.listar_transacoes_recentes_admin(p_limite integer) TO authenticated;

GRANT ALL ON FUNCTION public.listar_transacoes_recentes_admin(p_limite integer) TO service_role;



--
-- Name: FUNCTION listar_transacoes_usuario_admin(p_usuario_id uuid, p_tipo text, p_limite integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_transacoes_usuario_admin(p_usuario_id uuid, p_tipo text, p_limite integer, p_offset integer) TO anon;

GRANT ALL ON FUNCTION public.listar_transacoes_usuario_admin(p_usuario_id uuid, p_tipo text, p_limite integer, p_offset integer) TO authenticated;

GRANT ALL ON FUNCTION public.listar_transacoes_usuario_admin(p_usuario_id uuid, p_tipo text, p_limite integer, p_offset integer) TO service_role;



--
-- Name: FUNCTION listar_usuarios_admin(p_offset integer, p_limit integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.listar_usuarios_admin(p_offset integer, p_limit integer) TO anon;

GRANT ALL ON FUNCTION public.listar_usuarios_admin(p_offset integer, p_limit integer) TO authenticated;

GRANT ALL ON FUNCTION public.listar_usuarios_admin(p_offset integer, p_limit integer) TO service_role;



--
-- Name: FUNCTION marcar_rodadas_gratis_usadas(p_cupom_uso_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.marcar_rodadas_gratis_usadas(p_cupom_uso_id uuid) TO anon;

GRANT ALL ON FUNCTION public.marcar_rodadas_gratis_usadas(p_cupom_uso_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.marcar_rodadas_gratis_usadas(p_cupom_uso_id uuid) TO service_role;



--
-- Name: FUNCTION obter_analise_risco_saque_admin(p_saque_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_analise_risco_saque_admin(p_saque_id uuid) TO anon;

GRANT ALL ON FUNCTION public.obter_analise_risco_saque_admin(p_saque_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.obter_analise_risco_saque_admin(p_saque_id uuid) TO service_role;



--
-- Name: FUNCTION obter_aviator_config_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_aviator_config_admin() TO anon;

GRANT ALL ON FUNCTION public.obter_aviator_config_admin() TO authenticated;

GRANT ALL ON FUNCTION public.obter_aviator_config_admin() TO service_role;



--
-- Name: FUNCTION obter_aviator_engine_config(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.obter_aviator_engine_config() FROM PUBLIC;

GRANT ALL ON FUNCTION public.obter_aviator_engine_config() TO service_role;



--
-- Name: FUNCTION obter_bonus_usuario(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_bonus_usuario() TO anon;

GRANT ALL ON FUNCTION public.obter_bonus_usuario() TO authenticated;

GRANT ALL ON FUNCTION public.obter_bonus_usuario() TO service_role;



--
-- Name: FUNCTION obter_bspay_config_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_bspay_config_admin() TO anon;

GRANT ALL ON FUNCTION public.obter_bspay_config_admin() TO authenticated;

GRANT ALL ON FUNCTION public.obter_bspay_config_admin() TO service_role;



--
-- Name: FUNCTION obter_carteira_ativa(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_carteira_ativa() TO anon;

GRANT ALL ON FUNCTION public.obter_carteira_ativa() TO authenticated;

GRANT ALL ON FUNCTION public.obter_carteira_ativa() TO service_role;



--
-- Name: FUNCTION obter_config_plataforma(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_config_plataforma() TO anon;

GRANT ALL ON FUNCTION public.obter_config_plataforma() TO authenticated;

GRANT ALL ON FUNCTION public.obter_config_plataforma() TO service_role;



--
-- Name: FUNCTION obter_detalhes_deposito_admin(p_deposito_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_detalhes_deposito_admin(p_deposito_id uuid) TO anon;

GRANT ALL ON FUNCTION public.obter_detalhes_deposito_admin(p_deposito_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.obter_detalhes_deposito_admin(p_deposito_id uuid) TO service_role;



--
-- Name: FUNCTION obter_detalhes_usuario_admin(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION obter_indicacao_config_usuario(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_indicacao_config_usuario(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.obter_indicacao_config_usuario(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.obter_indicacao_config_usuario(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION obter_indicacao_usuario_admin(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION obter_misticpay_config_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_misticpay_config_admin() TO anon;

GRANT ALL ON FUNCTION public.obter_misticpay_config_admin() TO authenticated;

GRANT ALL ON FUNCTION public.obter_misticpay_config_admin() TO service_role;



--
-- Name: FUNCTION obter_payment_gateway_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_payment_gateway_admin() TO anon;

GRANT ALL ON FUNCTION public.obter_payment_gateway_admin() TO authenticated;

GRANT ALL ON FUNCTION public.obter_payment_gateway_admin() TO service_role;



--
-- Name: FUNCTION obter_roleta_config(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_roleta_config() TO anon;

GRANT ALL ON FUNCTION public.obter_roleta_config() TO authenticated;

GRANT ALL ON FUNCTION public.obter_roleta_config() TO service_role;



--
-- Name: FUNCTION obter_rollover_usuario(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_rollover_usuario() TO anon;

GRANT ALL ON FUNCTION public.obter_rollover_usuario() TO authenticated;

GRANT ALL ON FUNCTION public.obter_rollover_usuario() TO service_role;



--
-- Name: FUNCTION obter_rollover_usuario_admin(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_rollover_usuario_admin(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.obter_rollover_usuario_admin(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.obter_rollover_usuario_admin(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION obter_stats_dashboard_admin(p_periodo text, p_data_inicio date, p_data_fim date); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_stats_dashboard_admin(p_periodo text, p_data_inicio date, p_data_fim date) TO anon;

GRANT ALL ON FUNCTION public.obter_stats_dashboard_admin(p_periodo text, p_data_inicio date, p_data_fim date) TO authenticated;

GRANT ALL ON FUNCTION public.obter_stats_dashboard_admin(p_periodo text, p_data_inicio date, p_data_fim date) TO service_role;



--
-- Name: FUNCTION obter_stats_depositos_admin(p_periodo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_stats_depositos_admin(p_periodo text) TO anon;

GRANT ALL ON FUNCTION public.obter_stats_depositos_admin(p_periodo text) TO authenticated;

GRANT ALL ON FUNCTION public.obter_stats_depositos_admin(p_periodo text) TO service_role;



--
-- Name: FUNCTION obter_stats_saques_admin(p_periodo text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_stats_saques_admin(p_periodo text) TO anon;

GRANT ALL ON FUNCTION public.obter_stats_saques_admin(p_periodo text) TO authenticated;

GRANT ALL ON FUNCTION public.obter_stats_saques_admin(p_periodo text) TO service_role;



--
-- Name: FUNCTION obter_stats_usuarios_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_stats_usuarios_admin() TO anon;

GRANT ALL ON FUNCTION public.obter_stats_usuarios_admin() TO authenticated;

GRANT ALL ON FUNCTION public.obter_stats_usuarios_admin() TO service_role;



--
-- Name: FUNCTION obter_status_roleta(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_status_roleta() TO anon;

GRANT ALL ON FUNCTION public.obter_status_roleta() TO authenticated;

GRANT ALL ON FUNCTION public.obter_status_roleta() TO service_role;



--
-- Name: FUNCTION obter_veopag_config_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_veopag_config_admin() TO anon;

GRANT ALL ON FUNCTION public.obter_veopag_config_admin() TO authenticated;

GRANT ALL ON FUNCTION public.obter_veopag_config_admin() TO service_role;



--
-- Name: FUNCTION obter_vip_usuario(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.obter_vip_usuario() TO anon;

GRANT ALL ON FUNCTION public.obter_vip_usuario() TO authenticated;

GRANT ALL ON FUNCTION public.obter_vip_usuario() TO service_role;



--
-- Name: FUNCTION processar_callback_playfiver(p_email text, p_txn_id text, p_bet numeric, p_win numeric, p_jogo text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.processar_callback_playfiver(p_email text, p_txn_id text, p_bet numeric, p_win numeric, p_jogo text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.processar_callback_playfiver(p_email text, p_txn_id text, p_bet numeric, p_win numeric, p_jogo text) TO service_role;



--
-- Name: FUNCTION processar_recompensa_indicacao(p_usuario_indicado_id uuid, p_deposito_id uuid, p_valor_deposito numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.processar_recompensa_indicacao(p_usuario_indicado_id uuid, p_deposito_id uuid, p_valor_deposito numeric) TO anon;

GRANT ALL ON FUNCTION public.processar_recompensa_indicacao(p_usuario_indicado_id uuid, p_deposito_id uuid, p_valor_deposito numeric) TO authenticated;

GRANT ALL ON FUNCTION public.processar_recompensa_indicacao(p_usuario_indicado_id uuid, p_deposito_id uuid, p_valor_deposito numeric) TO service_role;



--
-- Name: FUNCTION processar_vip_deposito(p_usuario_id uuid, p_deposito_id uuid, p_valor numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.processar_vip_deposito(p_usuario_id uuid, p_deposito_id uuid, p_valor numeric) TO anon;

GRANT ALL ON FUNCTION public.processar_vip_deposito(p_usuario_id uuid, p_deposito_id uuid, p_valor numeric) TO authenticated;

GRANT ALL ON FUNCTION public.processar_vip_deposito(p_usuario_id uuid, p_deposito_id uuid, p_valor numeric) TO service_role;



--
-- Name: FUNCTION protect_usuario_sensitive_columns(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.protect_usuario_sensitive_columns() TO anon;

GRANT ALL ON FUNCTION public.protect_usuario_sensitive_columns() TO authenticated;

GRANT ALL ON FUNCTION public.protect_usuario_sensitive_columns() TO service_role;



--
-- Name: FUNCTION registrar_admin_log(p_acao text, p_detalhes text, p_status text, p_categoria text, p_metadata jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.registrar_admin_log(p_acao text, p_detalhes text, p_status text, p_categoria text, p_metadata jsonb) TO anon;

GRANT ALL ON FUNCTION public.registrar_admin_log(p_acao text, p_detalhes text, p_status text, p_categoria text, p_metadata jsonb) TO authenticated;

GRANT ALL ON FUNCTION public.registrar_admin_log(p_acao text, p_detalhes text, p_status text, p_categoria text, p_metadata jsonb) TO service_role;



--
-- Name: FUNCTION remover_membro_equipe(p_usuario_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.remover_membro_equipe(p_usuario_id uuid) TO anon;

GRANT ALL ON FUNCTION public.remover_membro_equipe(p_usuario_id uuid) TO authenticated;

GRANT ALL ON FUNCTION public.remover_membro_equipe(p_usuario_id uuid) TO service_role;



--
-- Name: FUNCTION reprovar_pendentes_saques_admin(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.reprovar_pendentes_saques_admin() TO anon;

GRANT ALL ON FUNCTION public.reprovar_pendentes_saques_admin() TO authenticated;

GRANT ALL ON FUNCTION public.reprovar_pendentes_saques_admin() TO service_role;



--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;



--
-- Name: FUNCTION salvar_bspay_config_admin(p_bspay_client_id text, p_bspay_client_secret text, p_bspay_signing_key text, p_bspay_webhook_secret text, p_bspay_api_url text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.salvar_bspay_config_admin(p_bspay_client_id text, p_bspay_client_secret text, p_bspay_signing_key text, p_bspay_webhook_secret text, p_bspay_api_url text) TO anon;

GRANT ALL ON FUNCTION public.salvar_bspay_config_admin(p_bspay_client_id text, p_bspay_client_secret text, p_bspay_signing_key text, p_bspay_webhook_secret text, p_bspay_api_url text) TO authenticated;

GRANT ALL ON FUNCTION public.salvar_bspay_config_admin(p_bspay_client_id text, p_bspay_client_secret text, p_bspay_signing_key text, p_bspay_webhook_secret text, p_bspay_api_url text) TO service_role;



--
-- Name: FUNCTION salvar_misticpay_config_admin(p_misticpay_ci text, p_misticpay_cs text, p_misticpay_api_url text, p_misticpay_webhook_secret text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.salvar_misticpay_config_admin(p_misticpay_ci text, p_misticpay_cs text, p_misticpay_api_url text, p_misticpay_webhook_secret text) TO anon;

GRANT ALL ON FUNCTION public.salvar_misticpay_config_admin(p_misticpay_ci text, p_misticpay_cs text, p_misticpay_api_url text, p_misticpay_webhook_secret text) TO authenticated;

GRANT ALL ON FUNCTION public.salvar_misticpay_config_admin(p_misticpay_ci text, p_misticpay_cs text, p_misticpay_api_url text, p_misticpay_webhook_secret text) TO service_role;



--
-- Name: FUNCTION salvar_payment_gateway_admin(p_payment_gateway_deposit text, p_payment_gateway_withdraw text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.salvar_payment_gateway_admin(p_payment_gateway_deposit text, p_payment_gateway_withdraw text) TO anon;

GRANT ALL ON FUNCTION public.salvar_payment_gateway_admin(p_payment_gateway_deposit text, p_payment_gateway_withdraw text) TO authenticated;

GRANT ALL ON FUNCTION public.salvar_payment_gateway_admin(p_payment_gateway_deposit text, p_payment_gateway_withdraw text) TO service_role;



--
-- Name: FUNCTION salvar_veopag_config_admin(p_veopag_client_id text, p_veopag_client_secret text, p_veopag_webhook_secret text, p_veopag_api_url text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.salvar_veopag_config_admin(p_veopag_client_id text, p_veopag_client_secret text, p_veopag_webhook_secret text, p_veopag_api_url text) TO anon;

GRANT ALL ON FUNCTION public.salvar_veopag_config_admin(p_veopag_client_id text, p_veopag_client_secret text, p_veopag_webhook_secret text, p_veopag_api_url text) TO authenticated;

GRANT ALL ON FUNCTION public.salvar_veopag_config_admin(p_veopag_client_id text, p_veopag_client_secret text, p_veopag_webhook_secret text, p_veopag_api_url text) TO service_role;



--
-- Name: FUNCTION solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text) TO anon;

GRANT ALL ON FUNCTION public.solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text) TO authenticated;

GRANT ALL ON FUNCTION public.solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text) TO service_role;



--
-- Name: FUNCTION subtrair_saldo_saque(p_usuario_id uuid, p_valor_saque numeric); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(p_usuario_id uuid, p_valor_saque numeric) FROM PUBLIC;

GRANT ALL ON FUNCTION public.subtrair_saldo_saque(p_usuario_id uuid, p_valor_saque numeric) TO service_role;



--
-- Name: FUNCTION sync_carteira_ativa_launch(p_user_id uuid, p_carteira text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_carteira_ativa_launch(p_user_id uuid, p_carteira text) TO anon;

GRANT ALL ON FUNCTION public.sync_carteira_ativa_launch(p_user_id uuid, p_carteira text) TO authenticated;

GRANT ALL ON FUNCTION public.sync_carteira_ativa_launch(p_user_id uuid, p_carteira text) TO service_role;



--
-- Name: FUNCTION trg_admin_audit_log(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_admin_audit_log() TO anon;

GRANT ALL ON FUNCTION public.trg_admin_audit_log() TO authenticated;

GRANT ALL ON FUNCTION public.trg_admin_audit_log() TO service_role;



--
-- Name: FUNCTION trg_cupom_uso_giros_ativado(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trg_cupom_uso_giros_ativado() TO anon;

GRANT ALL ON FUNCTION public.trg_cupom_uso_giros_ativado() TO authenticated;

GRANT ALL ON FUNCTION public.trg_cupom_uso_giros_ativado() TO service_role;



--
-- Name: FUNCTION trim_aviator_velas(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.trim_aviator_velas() TO anon;

GRANT ALL ON FUNCTION public.trim_aviator_velas() TO authenticated;

GRANT ALL ON FUNCTION public.trim_aviator_velas() TO service_role;



--
-- Name: FUNCTION validar_cupom(p_codigo text, p_valor_deposito numeric); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_cupom(p_codigo text, p_valor_deposito numeric) TO anon;

GRANT ALL ON FUNCTION public.validar_cupom(p_codigo text, p_valor_deposito numeric) TO authenticated;

GRANT ALL ON FUNCTION public.validar_cupom(p_codigo text, p_valor_deposito numeric) TO service_role;



--
-- Name: FUNCTION validar_limite_saques_diarios(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_limite_saques_diarios() TO anon;

GRANT ALL ON FUNCTION public.validar_limite_saques_diarios() TO authenticated;

GRANT ALL ON FUNCTION public.validar_limite_saques_diarios() TO service_role;



--
-- Name: FUNCTION validar_rollover_saque(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_rollover_saque() TO anon;

GRANT ALL ON FUNCTION public.validar_rollover_saque() TO authenticated;

GRANT ALL ON FUNCTION public.validar_rollover_saque() TO service_role;



--
-- Name: FUNCTION validate_deposito_limits(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_deposito_limits() TO anon;

GRANT ALL ON FUNCTION public.validate_deposito_limits() TO authenticated;

GRANT ALL ON FUNCTION public.validate_deposito_limits() TO service_role;



--
-- Name: FUNCTION validate_saque_limits(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_saque_limits() TO anon;

GRANT ALL ON FUNCTION public.validate_saque_limits() TO authenticated;

GRANT ALL ON FUNCTION public.validate_saque_limits() TO service_role;



--
-- Name: TABLE admin_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.admin_logs TO anon;

GRANT ALL ON TABLE public.admin_logs TO authenticated;

GRANT ALL ON TABLE public.admin_logs TO service_role;



--
-- Name: TABLE all_games_categories; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.all_games_categories TO anon;

GRANT ALL ON TABLE public.all_games_categories TO authenticated;

GRANT ALL ON TABLE public.all_games_categories TO service_role;



--
-- Name: TABLE all_games_page_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.all_games_page_config TO anon;

GRANT ALL ON TABLE public.all_games_page_config TO authenticated;

GRANT ALL ON TABLE public.all_games_page_config TO service_role;



--
-- Name: TABLE all_games_providers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.all_games_providers TO anon;

GRANT ALL ON TABLE public.all_games_providers TO authenticated;

GRANT ALL ON TABLE public.all_games_providers TO service_role;



--
-- Name: TABLE aviator_bets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.aviator_bets TO anon;

GRANT ALL ON TABLE public.aviator_bets TO authenticated;

GRANT ALL ON TABLE public.aviator_bets TO service_role;



--
-- Name: TABLE aviator_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.aviator_config TO anon;

GRANT ALL ON TABLE public.aviator_config TO authenticated;

GRANT ALL ON TABLE public.aviator_config TO service_role;



--
-- Name: TABLE aviator_rounds; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.aviator_rounds TO anon;

GRANT ALL ON TABLE public.aviator_rounds TO authenticated;

GRANT ALL ON TABLE public.aviator_rounds TO service_role;



--
-- Name: SEQUENCE aviator_rounds_round_number_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.aviator_rounds_round_number_seq TO anon;

GRANT ALL ON SEQUENCE public.aviator_rounds_round_number_seq TO authenticated;

GRANT ALL ON SEQUENCE public.aviator_rounds_round_number_seq TO service_role;



--
-- Name: TABLE aviator_velas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.aviator_velas TO anon;

GRANT ALL ON TABLE public.aviator_velas TO authenticated;

GRANT ALL ON TABLE public.aviator_velas TO service_role;



--
-- Name: TABLE bonus_conversoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bonus_conversoes TO anon;

GRANT ALL ON TABLE public.bonus_conversoes TO authenticated;

GRANT ALL ON TABLE public.bonus_conversoes TO service_role;



--
-- Name: TABLE cms_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cms_items TO anon;

GRANT ALL ON TABLE public.cms_items TO authenticated;

GRANT ALL ON TABLE public.cms_items TO service_role;



--
-- Name: TABLE cupom_usos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cupom_usos TO anon;

GRANT ALL ON TABLE public.cupom_usos TO authenticated;

GRANT ALL ON TABLE public.cupom_usos TO service_role;



--
-- Name: TABLE depositos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.depositos TO anon;

GRANT ALL ON TABLE public.depositos TO authenticated;

GRANT ALL ON TABLE public.depositos TO service_role;



--
-- Name: TABLE home_section_games; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.home_section_games TO anon;

GRANT ALL ON TABLE public.home_section_games TO authenticated;

GRANT ALL ON TABLE public.home_section_games TO service_role;



--
-- Name: TABLE home_section_providers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.home_section_providers TO anon;

GRANT ALL ON TABLE public.home_section_providers TO authenticated;

GRANT ALL ON TABLE public.home_section_providers TO service_role;



--
-- Name: TABLE home_sections; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.home_sections TO anon;

GRANT ALL ON TABLE public.home_sections TO authenticated;

GRANT ALL ON TABLE public.home_sections TO service_role;



--
-- Name: TABLE integration_secrets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.integration_secrets TO service_role;



--
-- Name: TABLE platform_games; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.platform_games TO anon;

GRANT ALL ON TABLE public.platform_games TO authenticated;

GRANT ALL ON TABLE public.platform_games TO service_role;



--
-- Name: TABLE platform_providers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.platform_providers TO anon;

GRANT ALL ON TABLE public.platform_providers TO authenticated;

GRANT ALL ON TABLE public.platform_providers TO service_role;



--
-- Name: TABLE prize_wheel_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prize_wheel_config TO anon;

GRANT ALL ON TABLE public.prize_wheel_config TO authenticated;

GRANT ALL ON TABLE public.prize_wheel_config TO service_role;



--
-- Name: TABLE prize_wheel_segments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prize_wheel_segments TO anon;

GRANT ALL ON TABLE public.prize_wheel_segments TO authenticated;

GRANT ALL ON TABLE public.prize_wheel_segments TO service_role;



--
-- Name: TABLE prize_wheel_spins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.prize_wheel_spins TO anon;

GRANT ALL ON TABLE public.prize_wheel_spins TO authenticated;

GRANT ALL ON TABLE public.prize_wheel_spins TO service_role;



--
-- Name: TABLE saques; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.saques TO anon;

GRANT ALL ON TABLE public.saques TO authenticated;

GRANT ALL ON TABLE public.saques TO service_role;



--
-- Name: TABLE site_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.site_config TO anon;

GRANT ALL ON TABLE public.site_config TO authenticated;

GRANT ALL ON TABLE public.site_config TO service_role;



--
-- Name: TABLE tracking_pixels; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tracking_pixels TO anon;

GRANT ALL ON TABLE public.tracking_pixels TO authenticated;

GRANT ALL ON TABLE public.tracking_pixels TO service_role;



--
-- Name: TABLE transacoes_jogos; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.transacoes_jogos TO anon;

GRANT SELECT,REFERENCES,TRIGGER,MAINTAIN ON TABLE public.transacoes_jogos TO authenticated;

GRANT ALL ON TABLE public.transacoes_jogos TO service_role;



--
-- Name: TABLE usuarios; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.usuarios TO anon;

GRANT ALL ON TABLE public.usuarios TO authenticated;

GRANT ALL ON TABLE public.usuarios TO service_role;



--
-- Name: TABLE vip_historico; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vip_historico TO anon;

GRANT ALL ON TABLE public.vip_historico TO authenticated;

GRANT ALL ON TABLE public.vip_historico TO service_role;



--
-- Name: TABLE vip_niveis; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.vip_niveis TO anon;

GRANT ALL ON TABLE public.vip_niveis TO authenticated;

GRANT ALL ON TABLE public.vip_niveis TO service_role;



--
-- Name: TABLE webhook_deliveries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.webhook_deliveries TO anon;

GRANT ALL ON TABLE public.webhook_deliveries TO authenticated;

GRANT ALL ON TABLE public.webhook_deliveries TO service_role;



--
-- Name: TABLE webhooks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.webhooks TO service_role;



--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;



--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;



--
-- PostgreSQL database dump complete
--

\unrestrict P1epEvReoV7kQNagrlsGyCeXZLgS1PtLgtch4Wd2Ect3mOKqfjdz2KaPWrdjRas

