--
-- PostgreSQL database dump
--

\restrict ES373gT6X97ii3Q6oL3BtnCBE5xiuKM0wm8MmtiBQSlZtDhVObjCD2mYS9dwyBK

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: all_games_categories; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.all_games_categories DISABLE TRIGGER ALL;

COPY public.all_games_categories (id, slug, nome, ordem, ativo, created_at, updated_at) FROM stdin;
d1111111-1111-1111-1111-111111111101	all	Todos	1	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
d1111111-1111-1111-1111-111111111102	slots	Slots	2	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
d1111111-1111-1111-1111-111111111103	live	Cassino Ao Vivo	3	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
d1111111-1111-1111-1111-111111111104	table	Jogos de Mesa	4	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
d1111111-1111-1111-1111-111111111105	crash	Crash Games	5	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
\.


ALTER TABLE public.all_games_categories ENABLE TRIGGER ALL;

--
-- Data for Name: all_games_page_config; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.all_games_page_config DISABLE TRIGGER ALL;

COPY public.all_games_page_config (id, titulo, jogos_por_pagina, updated_at) FROM stdin;
1	Todos os jogos	18	2026-07-12 22:02:30.741283+00
\.


ALTER TABLE public.all_games_page_config ENABLE TRIGGER ALL;

--
-- Data for Name: all_games_providers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.all_games_providers DISABLE TRIGGER ALL;

COPY public.all_games_providers (id, slug, nome, api_provider_id, ordem, ativo, created_at, updated_at) FROM stdin;
c1111111-1111-1111-1111-111111111101	all	Todos	\N	1	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111102	venuzbet	RoyalBet Originais	\N	2	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111103	pgsoft	PG Soft	1	3	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111104	pragmatic	Pragmatic Play	\N	4	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111105	pragmaticlive	Pragmatic Live	\N	5	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111106	netent	NetEnt	\N	6	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111107	evolution	Evolution Gaming	\N	7	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111108	redtiger	Red Tiger	\N	8	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111109	playson	Playson	\N	9	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111110	habanero	Habanero	\N	10	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111111	spribe	Spribe	\N	11	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111112	evoplay	Evoplay	\N	12	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111113	bgaming	BGaming	\N	13	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111114	ezugi	Ezugi	\N	14	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
c1111111-1111-1111-1111-111111111115	cgames	C Games	\N	15	t	2026-07-12 22:02:30.741283+00	2026-07-12 22:02:30.741283+00
\.


ALTER TABLE public.all_games_providers ENABLE TRIGGER ALL;

--
-- Data for Name: aviator_config; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.aviator_config DISABLE TRIGGER ALL;

COPY public.aviator_config (id, rtp_base, rtp_min, rtp_max, recovery_enabled, recovery_window_hours, ggr_target_pct, recovery_strength, recovery_max_adjustment, min_wagered_for_recovery, min_crash, max_crash, queue_size, updated_at, recovery_loss_trigger_brl, recovery_profit_trigger_brl, pct_vela_azul, pct_vela_roxa, pct_vela_rosa, rtp_limit_min_pct, rtp_limit_max_pct, crash_technical_max, modo_geracao, geracao_min_crash, geracao_max_crash) FROM stdin;
1	0.8500	0.9500	0.9900	f	24	0.00	0.9700	0.0200	100.00	500.00	500.00	100	2026-07-29 16:01:49.163331+00	10000.00	10000.00	45.00	30.00	25.00	85.00	99.99	1000.00	velas	1.00	50.00
\.


ALTER TABLE public.aviator_config ENABLE TRIGGER ALL;

--
-- Data for Name: cms_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cms_items DISABLE TRIGGER ALL;

COPY public.cms_items (id, secao, nome_admin, titulo, texto, imagem_url, imagem_mobile_url, game_name, provider, link_tipo, href, ordem, ativo, created_at, updated_at, background_color, bloom_color, outer_glow, text_theme, layout, icon_type, icon_value, icon_alt, labels, categoria_slug, category_tipo, destaque) FROM stdin;
48702657-fedc-4447-bed9-ae726344866a	quick_nav	mines	Mines	\N	https://cdn.royalbetsolutions.com/default/minibanners/mines.webp	\N	\N	\N	href	/spribe/mines	4	t	2026-07-13 16:42:42.579302+00	2026-07-27 18:43:57.311+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
de62bd34-3bdc-4b3b-a11e-b0c24448c1ed	quick_nav	Dragon	Tiger	\N	https://cdn.royalbetsolutions.com/default/minibanners/fortune-tiger.webp	\N	\N	\N	href	/pgsoft/fortune-tiger	2	t	2026-07-13 13:31:58.288087+00	2026-07-27 18:44:12.547+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
b3c4797e-970b-4bc2-87e1-b8a029ccdf32	quick_nav	Tiger	Dragon	\N	https://cdn.royalbetsolutions.com/default/minibanners/fortune-dragon.webp	\N	\N	\N	href	/pgsoft/fortune-dragon	3	t	2026-07-13 13:28:26.82725+00	2026-07-27 18:44:16.467+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
bbd5651d-d068-4930-8201-d095cf6757d0	sidebar_category	ESPORTES	esportes	\N	\N	\N	\N	\N	\N	\N	2	t	2026-07-30 13:04:37.82741+00	2026-07-30 13:04:45.208+00	\N	\N	\N	\N	\N	\N	\N	\N	{"en": {"line1": "SPORTS", "line2": null}, "es": {"line1": "DEPORTES", "line2": null}, "pt": {"line1": "ESPORTES", "line2": null}}	\N	menu	f
28837780-ae46-4a08-b402-a3c891ce7203	quick_nav	Rabbit	Rabbit	\N	https://cdn.royalbetsolutions.com/default/minibanners/fortune-rabbit.webp	\N	\N	\N	href	/pgsoft/fortune-rabbit	5	t	2026-07-13 16:43:51.533981+00	2026-07-27 18:44:33.615+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
f001cbbb-93bd-4d0d-986c-ed700625a09e	quick_nav	olympus	Olympus	\N	https://cdn.royalbetsolutions.com/default/minibanners/gate.webp	\N	\N	\N	href	/pragmatic/gates-of-olympus	6	t	2026-07-13 16:44:09.803088+00	2026-07-27 18:44:51.759+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
69e4b8b6-03c2-490e-bff8-a3943db29de9	quick_nav	Esportes	Esportes	\N	https://cdn.royalbetsolutions.com/default/minibanners/sports.webp	\N	\N	\N	href	/esportes	7	t	2026-07-13 16:44:19.406104+00	2026-07-27 18:45:07.875+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
b1111111-1111-1111-1111-111111111103	sidebar_card	Suporte Ao Vivo	\N	\N	\N	\N	\N	\N	\N	/help/support	5	t	2026-07-22 16:36:39.578336+00	2026-07-30 15:44:26.03+00	#15803d	#4ADE80	rgba(21, 128, 61, 0.48)	light	single	iconify	ph:headset-duotone	\N	{"en": {"line1": "Live Support", "line2": null}, "es": {"line1": "Soporte en Vivo", "line2": null}, "pt": {"line1": "Suporte Ao Vivo", "line2": null}}	\N	\N	f
ac3cf6c1-2aaf-488b-bad3-f482b252be8e	quick_nav	Roleta	Roleta	\N	https://cdn.royalbetsolutions.com/default/minibanners/casino-live.webp	\N	\N	\N	href	/oficial-pragmatic-live/speed-roulette-1	8	t	2026-07-13 16:44:55.578915+00	2026-07-30 15:58:16.833+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
0e109509-5e66-4e74-a9dd-237ef2c2ec51	sidebar_menu_item	Promoções	\N	\N	\N	\N	\N	\N	href	/help/promotions	17	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	ph:gift-duotone	\N	{"en": {"line1": "Promotions"}, "es": {"line1": "Promociones"}, "pt": {"line1": "Promoções"}}	extras	\N	t
8c2aaaec-8e0b-4ef5-8e9b-9bd548aa8978	sidebar_menu_item	Bundesliga (Alemanha)	\N	\N	\N	\N	\N	\N	href	esportes	12	t	2026-07-30 13:25:51.571348+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	twemoji:flag-germany	\N	{"en": {"line1": "Bundesliga (Germany)", "line2": null}, "es": {"line1": "Bundesliga (Alemania)", "line2": null}, "pt": {"line1": "Bundesliga (Alemanha)", "line2": null}}	esportes	\N	t
193128e7-59d5-4d1b-9415-7dddd336f2f2	sidebar_menu_item	Copa Libertadores	\N	\N	\N	\N	\N	\N	href	esportes	13	t	2026-07-30 13:22:13.253865+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	image	https://i.imgur.com/L2XdxwT.png	\N	{"en": {"line1": "Copa Libertadores.", "line2": null}, "es": {"line1": "Copa Libertadores", "line2": null}, "pt": {"line1": "Copa Libertadores", "line2": null}}	esportes	\N	t
ca2d6283-e5f2-4d58-8abc-0fed614ef123	sidebar_menu_item	Ativar cupom	\N	openCouponModal	\N	\N	\N	\N	event	\N	18	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	streamline:discount-percent-coupon-solid	\N	{"en": {"line1": "Activate coupon"}, "es": {"line1": "Activar cupón"}, "pt": {"line1": "Ativar cupom"}}	extras	\N	t
b1111111-1111-1111-1111-111111111101	sidebar_card	Indique um Amigo	\N	\N	https://royalbetsolutions.com/_ipx/f_webp/assets/imgs/gift-sidebar.png	\N	\N	\N	\N	/help/referral	1	t	2026-07-12 21:55:35.371503+00	2026-07-30 15:44:26.03+00	#2B59FF	#2B59FF	rgba(43, 89, 255, 0.48)	light	double	image	https://royalbetsolutions.com/_ipx/f_webp/assets/imgs/gift-sidebar.png	\N	{"en": {"line1": "Refer a friend and", "line2": "GET R$ 15 FREE"}, "es": {"line1": "Invita a un amigo y", "line2": "GANA R$ 15 GRÁTIS"}, "pt": {"line1": "Indique um amigo e", "line2": "GANHE R$ 15 GRÁTIS"}}	\N	\N	f
4d433458-0179-48a4-bf8c-c3b38cdcba4c	quick_nav	Aplicativo	Aplicativo	\N	https://cdn.royalbetsolutions.com/default/minibanners/app-download.webp	\N	\N	\N	href	help/mobile	9	t	2026-07-17 11:26:12.3142+00	2026-07-30 15:59:19.319+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
c1111111-1111-1111-1111-111111111103	recommended	\N	Banner 3	\N	https://cdn.royalbetsolutions.com/royalbetsolutions-com-images/images/1757717604006.avif	https://cdn.royalbetsolutions.com/royalbetsolutions-com-images/images/1757717604006.avif	\N	\N	href	/oficial-evolution-live/bac-bo	3	t	2026-07-13 12:38:04.697858+00	2026-07-21 16:03:02.724+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
c1111111-1111-1111-1111-111111111102	recommended	\N	Banner 2	\N	https://cdn.royalbetsolutions.com/royalbetsolutions-com-images/images/1757717475647.avif	https://cdn.royalbetsolutions.com/royalbetsolutions-com-images/images/1757717475647.avif	\N	\N	href	/pgsoft/fortune-dragon	2	t	2026-07-13 12:38:04.697858+00	2026-07-21 16:03:08.39+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
c1111111-1111-1111-1111-111111111101	recommended	\N	Banner 1	\N	https://cdn.royalbetsolutions.com/royalbetsolutions-com-images/images/1757717288225.avif	https://cdn.royalbetsolutions.com/royalbetsolutions-com-images/images/1757717288225.avif	\N	\N	href	/spribe/aviator	1	t	2026-07-13 12:38:04.697858+00	2026-07-21 16:03:12.02+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
b8fca4be-d641-49b4-a8fa-518c31f9bdcb	sidebar_menu_item	NBA (EUA)	\N	\N	\N	\N	\N	\N	href	esportes	19	t	2026-07-30 13:27:03.324116+00	2026-07-30 13:29:01.486+00	\N	\N	\N	\N	\N	image	https://i.imgur.com/yZPV2z2.png	\N	{"en": {"line1": "NBA (USA)", "line2": null}, "es": {"line1": "NBA (EE. UU.)", "line2": null}, "pt": {"line1": "NBA (EUA)", "line2": null}}	esportes	\N	t
f7b176ea-24fa-45bc-8611-2efb84d410a7	sidebar_category	Extras	extras	\N	\N	\N	\N	\N	\N	\N	3	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:04:45.208+00	\N	\N	\N	\N	\N	\N	\N	\N	{"en": {"line1": "EXTRAS", "line2": null}, "es": {"line1": "EXTRAS", "line2": null}, "pt": {"line1": "EXTRAS", "line2": null}}	\N	menu	f
fd3b454c-41ca-48d3-90a6-fe3c358bd7f4	sidebar_category	Cassino	casino	\N	\N	\N	\N	\N	\N	\N	1	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:04:45.208+00	\N	\N	\N	\N	\N	\N	\N	\N	{"en": {"line1": "CASINO", "line2": null}, "es": {"line1": "CASINO", "line2": null}, "pt": {"line1": "CASSINO", "line2": null}}	\N	menu	f
f60d9af7-3a8e-4be3-b27f-807a4c3063ec	sidebar_category	Idioma	language	\N	\N	\N	\N	\N	\N	\N	4	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:04:45.208+00	\N	\N	\N	\N	\N	\N	\N	\N	{"en": {"line1": "LANGUAGE"}, "es": {"line1": "IDIOMA"}, "pt": {"line1": "IDIOMA"}}	\N	language	f
65b3e149-2ee7-408c-b77b-3594b6fde32e	sidebar_menu_item	Telegram	\N	https://t.me/stewgaming	\N	\N	\N	\N	external	\N	15	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:42:22.596+00	\N	\N	\N	\N	\N	iconify	ic:baseline-telegram	\N	{"en": {"line1": "Join our Telegram", "line2": null}, "es": {"line1": "Únete a nuestro Telegram", "line2": null}, "pt": {"line1": "Acesse Nosso Telegram", "line2": null}}	extras	\N	t
fc1ef303-9903-4907-9a7e-b0334aa13842	sidebar_menu_item	Fortune Tiger	\N	\N	\N	\N	Fortune Tiger	\N	game	\N	4	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	image	https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-tiger.svg	\N	{"en": {"line1": "Fortune Tiger"}, "es": {"line1": "Fortune Tiger"}, "pt": {"line1": "Fortune Tiger"}}	casino	\N	t
a705235e-e50a-4483-bca0-bbcdeda49fc8	sidebar_menu_item	Jogos de Slot	\N	\N	\N	\N	\N	\N	href	/slots	2	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	mdi:slot-machine	\N	{"en": {"line1": "Slot Games"}, "es": {"line1": "Juegos de Slot"}, "pt": {"line1": "Jogos de Slot"}}	casino	\N	t
d1111111-1111-1111-1111-111111111111	quick_nav	Football Studio	Football	\N	https://cdn.royalbetsolutions.com/default/minibanners/aviator.webp	\N	\N	\N	href	propria/aviator	1	t	2026-07-13 13:25:30.191133+00	2026-07-17 11:23:19.44+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
c9dcd487-fb5f-4d38-9945-d1256735cb62	home_banner	\N	1	\N	https://i.imgur.com/LDHQXX4.png	\N	\N	\N	\N	\N	1	t	2026-07-30 12:53:41.085387+00	2026-07-30 13:54:45.25+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
38a8aaa7-a81e-4940-a06e-b550bccb8680	home_banner	\N	2	\N	https://i.ibb.co/23Cs1x5v/Chat-GPT-Image-21-de-jul-de-2026-13-11-07.png	\N	\N	\N	\N	\N	2	t	2026-07-29 14:06:23.197039+00	2026-07-30 13:54:48.263+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
f7c70459-a4bb-4a97-b549-30ad71dd9ff9	sidebar_menu_item	Todos os Jogos	\N	\N	\N	\N	\N	\N	href	/games	1	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	material-symbols:stadia-controller	\N	{"en": {"line1": "All Games", "line2": null}, "es": {"line1": "Todos los Juegos", "line2": null}, "pt": {"line1": "Todos os Jogos", "line2": null}}	casino	\N	t
a5f615d8-e104-465f-9eec-e3e8399ee5ac	sidebar_menu_item	Provedoras	\N	\N	\N	\N	\N	\N	href	/providers	7	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	mdi:magic-staff	\N	{"en": {"line1": "Providers"}, "es": {"line1": "Proveedoras"}, "pt": {"line1": "Provedoras"}}	casino	\N	t
bd91c0a5-baf4-4a2f-8a39-7bffb944aa17	sidebar_menu_item	Mines	\N	\N	\N	\N	Mines	\N	game	\N	6	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	mdi:bomb	\N	{"en": {"line1": "Mines"}, "es": {"line1": "Mines"}, "pt": {"line1": "Mines"}}	casino	\N	t
369a20c9-690f-445c-8a20-ec16f1e7d8b8	sidebar_menu_item	La liga (Espanhol)	\N	\N	\N	\N	\N	\N	href	esportes	10	t	2026-07-30 13:24:19.683367+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	twemoji:flag-spain	\N	{"en": {"line1": "La Liga (Spanish)", "line2": null}, "es": {"line1": "La Liga (español)", "line2": null}, "pt": {"line1": "La liga (Espanhol)", "line2": null}}	esportes	\N	t
263d3695-7a94-49ac-8214-384b0a992648	promotion	Promoção - CASHBACK DIARIOS	CASHBACK DIARIOS	🎁 Regulamento Oficial – Cashback Diário StewGaming\n\n🎰 Introdução\n\nNa StewGaming, você aposta com emoção e ainda tem a oportunidade de recuperar parte do seu prejuízo nos jogos de Slots e Crash Games através do nosso Cashback Diário.\n\n💸 Aqui, cada giro e cada aposta valem a pena! Se o dia terminar no prejuízo, parte do valor pode voltar para você como saldo real, todos os dias.\n\n────────────────────────\n\n📋 Requisitos e Condições Gerais\n\n2.1 Período de Apuração\n\nO Cashback será calculado diariamente com base no saldo negativo obtido entre 00:00 e 23:59 (Horário de Brasília – GMT-3).\n\n2.2 Crédito do Cashback\n\nO valor será creditado automaticamente entre 00:00 e 12:00 do dia seguinte.\n\n2.3 Jogos Participantes\n\nSerão consideradas apenas apostas finalizadas nos seguintes jogos:\n\n🎰 Slots\n\n🚀 Crash Games\n\n2.4 Jogos Não Participantes\n\nAs apostas realizadas nas modalidades abaixo não entram no cálculo do Cashback:\n\n❌ Jogos de Mesa\n\n❌ Cassino ao Vivo\n\n❌ Apostas Esportivas\n\n❌ Vídeo Pôquer\n\n❌ Qualquer outro jogo fora das categorias Slots e Crash Games.\n\n2.5 Perda Mínima\n\nO valor mínimo de perda para receber Cashback é de R$ 50,00 em saldo real.\n\n2.6 Forma de Pagamento\n\nO Cashback será creditado como Saldo Real, sem necessidade de rollover.\n\n✅ Você poderá sacar o valor ou utilizá-lo em novas apostas.\n\n────────────────────────\n\n💰 Faixas de Cashback\n\nPerda Diária (Slots & Crash)\n\nR$ 50,00 até R$ 499,99 → 5%\n\nR$ 500,00 até R$ 999,99 → 8%\n\nR$ 1.000,00 até R$ 4.999,99 → 10%\n\nR$ 5.000,00 até R$ 9.999,99 → 15%\n\nR$ 10.000,00 até R$ 19.999,99 → 20%\n\nAcima de R$ 20.000,00 → 25%\n\n────────────────────────\n\n📊 Como é Calculado o Cashback\n\nO cálculo é realizado utilizando o GGR (Gross Gaming Revenue).\n\nFórmula:\n\nGGR = Valor Apostado − Valor Ganho\n\nRegras:\n\n✅ Se houver prejuízo, será aplicado o percentual correspondente da tabela de Cashback.\n\n❌ Se houver lucro no período, não haverá direito ao Cashback.\n\n────────────────────────\n\n📝 Exemplo\n\nVocê apostou:\n\n💸 R$ 1.500,00\n\nRecebeu em prêmios:\n\n🏆 R$ 300,00\n\nCálculo do GGR:\n\nR$ 1.500,00 − R$ 300,00 = R$ 1.200,00 de perda.\n\nFaixa correspondente:\n\n🎁 10% de Cashback\n\nValor recebido:\n\nR$ 1.200,00 × 10% = R$ 120,00\n\n────────────────────────\n\n✅ Regras de Elegibilidade\n\nPara participar da promoção é necessário:\n\n✔️ Possuir uma conta ativa e verificada na StewGaming.\n\n✔️ Ter 18 anos ou mais.\n\n✔️ Residir no Brasil.\n\n⚠️ Contas duplicadas, irregulares ou com indícios de fraude serão automaticamente desclassificadas da promoção.\n\n────────────────────────\n\n🚫 Restrições\n\nO Cashback não será concedido nos seguintes casos:\n\n❌ Dias em que o jogador terminar com lucro.\n\n❌ Apostas canceladas, anuladas ou inválidas.\n\nA StewGaming reserva-se o direito de alterar, suspender ou encerrar esta promoção mediante aviso prévio de 24 horas.\n\n────────────────────────\n\n💬 Dúvidas e Suporte\n\nCaso tenha qualquer dúvida, nossa equipe está pronta para ajudar.\n\n💬 Chat ao vivo disponível 24 horas por dia.\n\n────────────────────────\n\n🎮 Jogue com Responsabilidade\n\nO jogo deve ser sempre uma forma de entretenimento.\n\n⚠️ Aposte com consciência e responsabilidade.	https://i.imgur.com/F8DNaSM.png	\N	\N	\N	\N	\N	1	t	2026-07-13 01:40:42.171993+00	2026-07-30 14:36:25.987+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
882a9081-c6db-4c2c-956e-2666a400d7f0	sidebar_card	sdfsdfsdf	\N	\N	https://royalbetsolutions.com/_ipx/f_webp/assets/icons/NotoWrappedGift.png	\N	\N	\N	\N	help/promotions	3	t	2026-07-12 22:45:03.469584+00	2026-07-30 15:44:26.03+00	#5C109C	#5C109C	rgba(92, 16, 156, 0.48)	light	double	image	https://royalbetsolutions.com/_ipx/f_webp/assets/icons/NotoWrappedGift.png	\N	{"en": {"line1": "Stay updated", "line2": "FROM PROMOTIONS"}, "es": {"line1": "¡Quédate ahí!", "line2": "DE PROMOCIONES"}, "pt": {"line1": "Fique por dentro", "line2": "DAS PROMOÇÕES"}}	\N	\N	f
e2e9a26a-934e-402c-be4b-c849a066f3a9	quick_nav	Indique e Ganhe	Indique e Ganhe	\N	https://cdn.royalbetsolutions.com/default/minibanners/indique.webp	\N	\N	\N	href	help/referral	10	t	2026-07-17 11:27:40.767017+00	2026-07-30 15:58:59.124+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
4882f42e-b968-434e-961e-51d815e7714a	sidebar_menu_item	Ligue 1 (França)	\N	\N	\N	\N	\N	\N	href	/esportes	11	t	2026-07-30 13:25:07.610333+00	2026-07-30 15:37:36.671+00	\N	\N	\N	\N	\N	iconify	twemoji:flag-france	\N	{"en": {"line1": "Ligue 1 (France)", "line2": null}, "es": {"line1": "Ligue 1 (Francia)", "line2": null}, "pt": {"line1": "Ligue 1 (França)", "line2": null}}	esportes	\N	t
f3cd1bf8-9594-457e-bc2b-11b73b8ec5aa	sidebar_menu_item	Fortune Dragon	\N	\N	\N	\N	Fortune Dragon	\N	game	\N	5	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	image	https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-dragon.svg	\N	{"en": {"line1": "Fortune Dragon"}, "es": {"line1": "Fortune Dragon"}, "pt": {"line1": "Fortune Dragon"}}	casino	\N	t
ab2c5c36-aa93-4df2-86f6-8b6ea26e1acb	sidebar_menu_item	Aviator	\N	\N	\N	\N	Aviator	\N	game	\N	3	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	image	https://royal-images.s3.us-east-1.amazonaws.com/default/menu/aviator.svg	\N	{"en": {"line1": "Aviator"}, "es": {"line1": "Aviator"}, "pt": {"line1": "Aviator"}}	casino	\N	t
91ed0d88-d7a8-4bea-a628-75342ecd7ec4	sidebar_menu_item	UEFA Champions League	\N	\N	\N	\N	\N	\N	href	/esportes	14	t	2026-07-30 13:23:37.011342+00	2026-07-30 15:37:57.02+00	\N	\N	\N	\N	\N	iconify	glyphs-poly:trophy	\N	{"en": {"line1": "UEFA Champions League.", "line2": null}, "es": {"line1": "Liga de Campeones de la UEFA", "line2": null}, "pt": {"line1": "UEFA Champions League", "line2": null}}	esportes	\N	t
9f2e4097-7c5a-407e-b4e2-74fac8d2e979	sidebar_menu_item	App Download	\N	\N	\N	\N	\N	\N	href	/help/mobile	16	t	2026-07-15 14:17:12.541885+00	2026-07-30 13:25:55.677+00	\N	\N	\N	\N	\N	iconify	ph:download-duotone	\N	{"en": {"line1": "App Download"}, "es": {"line1": "Descargar App"}, "pt": {"line1": "App Download"}}	extras	\N	t
4cb720fa-b3d3-4d53-9aac-916d4c9e28de	promotion	Roleta - ROLETA DA SORTE	Roleta - ROLETA DA SORTE	🎁 Gire, Ganhe e Repita!\n\nSua sorte se renova diariamente!\n\nJá pensou em ganhar giros grátis todos os dias apenas por entrar em sua conta?\n\nNa StewGaming, você tem uma chance diária de conquistar prêmios exclusivos nos slots mais populares da plataforma.\n\n────────────────────────\n\n🎯 Como Funciona\n\n1️⃣ Faça login na sua conta diariamente.\n\n2️⃣ Acesse a seção Roleta da Sorte. ( Canto inferior direito )\n\n3️⃣ Clique em "Girar" e descubra seu prêmio.\n\n4️⃣ Os Giros Grátis serão creditados automaticamente em sua conta.\n\n5️⃣ Volte no dia seguinte para uma nova chance. A roleta é reiniciada automaticamente à meia-noite (00:00).\n\n────────────────────────\n\n📜 Regras Importantes (Termos e Condições)\n\n🕒 Periodicidade\n\nCada usuário tem direito a 01 (um) giro por dia.\n\nA Roleta da Sorte é reiniciada diariamente às 00:00 (Horário de Brasília), independentemente do horário em que o giro anterior foi realizado.\n\n────────────────────────\n\n⏳ Validade dos Giros Grátis\n\nApós o resgate, os Giros Grátis permanecerão disponíveis por até 24 horas.\n\nApós esse período, os giros não utilizados serão expirados automaticamente.\n\n────────────────────────\n\n🔒 Política de Utilização\n\nA promoção é limitada a um resgate por CPF e endereço de IP.\n\nCaso seja identificado o uso do mesmo IP em múltiplas contas ou qualquer indício de fraude, a StewGaming poderá cancelar a promoção, os Giros Grátis concedidos e quaisquer ganhos obtidos por meio deles.\n\n────────────────────────\n\n🎰 Jogos Elegíveis\n\nOs Giros Grátis poderão ser utilizados exclusivamente nos jogos indicados no momento do recebimento do prêmio.\n\n────────────────────────\n\n⚠️ Disposições Gerais\n\nA StewGaming reserva-se o direito de alterar, suspender ou encerrar esta promoção a qualquer momento, mediante aviso prévio.\n\n────────────────────────\n\n💬 Dúvidas e Suporte\n\nCaso tenha qualquer dúvida, nossa equipe está pronta para ajudar.\n\n💬 Chat ao vivo disponível 24 horas por dia.\n\n────────────────────────\n\n🎮 Jogue com Responsabilidade\n\nO jogo deve ser sempre uma forma de entretenimento.\n\n⚠️ Aposte com consciência e responsabilidade.	https://i.imgur.com/h4gyWmQ.png	\N	\N	\N	\N	\N	2	t	2026-07-30 14:38:53.713793+00	2026-07-30 14:40:17.225+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
42901c53-4807-41aa-8c16-57b13e52a6d1	sidebar_menu_item	Brasileirão Série A	\N	\N	\N	\N	\N	\N	href	esportes	9	t	2026-07-30 13:17:30.701872+00	2026-07-30 15:36:59.088+00	\N	\N	\N	\N	\N	iconify	twemoji:flag-brazil	\N	{"en": {"line1": "Brasileirão Serie A", "line2": null}, "es": {"line1": "Brasileirão Serie A", "line2": null}, "pt": {"line1": "Brasileirão Série A", "line2": null}}	esportes	\N	t
b6bb3884-8ca5-4f06-9a9f-1a21875f69a9	sidebar_menu_item	NFL (EUA)	\N	\N	\N	\N	\N	\N	href	esportes	20	t	2026-07-30 13:30:19.353038+00	2026-07-30 13:30:18.739+00	\N	\N	\N	\N	\N	image	https://i.imgur.com/ag9i8qA.png	\N	{"en": {"line1": "NFL (USA)", "line2": null}, "es": {"line1": "NFL (EE. UU.)", "line2": null}, "pt": {"line1": "NFL (EUA)", "line2": null}}	esportes	\N	t
c1b3ddc6-a3e6-457e-9a68-e88397eb3266	home_banner	\N	3	\N	https://i.imgur.com/ElNstoy.png	\N	\N	\N	\N	\N	3	t	2026-07-30 12:54:31.892135+00	2026-07-30 13:54:36.383+00	\N	\N	\N	\N	\N	\N	\N	\N	{}	\N	\N	f
99a89ec3-367a-46e6-ae59-cc84b41c27cb	sidebar_card	Instale o App	\N	\N	https://cdn.royalbetsolutions.com/default/social-media/smartphone.svg	\N	\N	\N	\N	help/mobile	4	t	2026-07-12 22:49:52.350039+00	2026-07-30 15:45:07.817+00	#2e2d2f	#453257	rgba(69, 50, 87, 0.48)	light	double	image	https://cdn.royalbetsolutions.com/default/social-media/smartphone.svg	\N	{"en": {"line1": "Install our app and", "line2": "EARN BENEFIT"}, "es": {"line1": "Instala nuestra app y", "line2": "GANA BENEFICIOS"}, "pt": {"line1": "Instale nosso app e", "line2": "GANHE BENEFÍCIO"}}	\N	\N	f
\.


ALTER TABLE public.cms_items ENABLE TRIGGER ALL;

--
-- Data for Name: cupons; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cupons DISABLE TRIGGER ALL;

COPY public.cupons (id, nome_admin, codigo, ativo, tipo_valor, valor, tipo_bonus, deposito_minimo, bonus_maximo, limite_uso_total, limite_uso_por_usuario, usos_total, created_at, updated_at, jogo_slug, jogo_nome, provider_slug) FROM stdin;
0c3c97b0-799c-46bc-8d4e-090097f56fa2	TESTE	TESTE	t	fixo	10.00	giros_gratis	0.00	\N	\N	1	1	2026-07-21 03:15:06.224168+00	2026-07-21 03:15:11.95095+00	sugar-rush	Sugar Rush	pragmatic
56fa2c40-a0cc-4770-9f0d-3ef9ea404bac	TESTE2	TESTE2	t	fixo	10.00	saldo_real	\N	\N	\N	1	1	2026-07-21 04:31:22.041364+00	2026-07-21 04:31:27.201156+00	\N	\N	\N
c786864e-672f-4c79-a69a-be5e40f09066	Roleta - Starlight 1000	ROLETA-SP1K	t	fixo	55.00	giros_gratis	\N	\N	\N	999	5	2026-07-13 17:38:19.664579+00	2026-07-29 16:29:32.051556+00	starlight-princess-1000	Starlight Princess 1000	pragmatic
0e6230fa-12de-4d27-9a0e-f0202366cd42	Roleta - Gates 1000	ROLETA-GOO1K	t	fixo	95.00	giros_gratis	\N	\N	\N	999	5	2026-07-13 17:38:19.664579+00	2026-07-29 16:31:40.975664+00	gates-of-olympus-1000	Gates of Olympus 1000	pragmatic
e4c07e3c-99f5-48b1-9df6-6b2c91f830e0	Roleta - Sweet 1000	ROLETA-SB1K	t	fixo	100.00	giros_gratis	\N	\N	\N	999	4	2026-07-13 17:38:19.664579+00	2026-07-15 17:02:41.997722+00	sweet-bonanza-1000	Sweet Bonanza 1000	pragmatic
bbf32eb0-db3a-4643-8425-f1c3c41ff2ae	Roleta - Caramelo	ROLETA-CAR	t	fixo	65.00	giros_gratis	\N	\N	\N	999	9	2026-07-13 17:38:19.664579+00	2026-07-29 16:42:11.074674+00	o-vira-lata-caramelo	O Vira Lata Caramelo	pragmatic
226bcfdb-cc58-4be8-aec7-a871b71e8a03	Roleta - Sweet Bonanza	ROLETA-SB	t	fixo	95.00	giros_gratis	\N	\N	\N	999	3	2026-07-13 17:38:19.664579+00	2026-07-29 16:43:55.631906+00	sweet-bonanza	Sweet Bonanza	pragmatic
0a587f91-33ec-434e-9c13-194f2b315c15	Roleta - Sugar Rush	ROLETA-SR	t	fixo	65.00	giros_gratis	\N	\N	\N	999	11	2026-07-13 17:38:19.664579+00	2026-07-30 10:36:43.683184+00	sugar-rush	Sugar Rush	pragmatic
373c7871-ff40-4158-b332-6187735b78b1	Roleta - Gates of Olympus	ROLETA-GOO	t	fixo	85.00	giros_gratis	\N	\N	\N	999	7	2026-07-13 17:38:19.664579+00	2026-07-30 14:43:09.289663+00	gates-of-olympus	Gates of Olympus	pragmatic
5ad047bd-eca3-41c2-b83b-f34ec1c6fc00	Roleta - Starlight Princess	ROLETA-SP	t	fixo	70.00	giros_gratis	\N	\N	\N	999	7	2026-07-13 17:38:19.664579+00	2026-07-30 15:39:24.412259+00	starlight-princess	Starlight Princess	pragmatic
\.


ALTER TABLE public.cupons ENABLE TRIGGER ALL;

--
-- Data for Name: home_sections; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.home_sections DISABLE TRIGGER ALL;

COPY public.home_sections (id, slug, titulo, tipo, ordem, ativo, view_all_link, use_green_button, created_at, updated_at) FROM stdin;
6fe284e1-2a90-4654-9765-73c3b7a66799	jogoss-lots	Jogos Pragmatic	jogos_pg	8	t	provider/pragmatic	f	2026-07-30 15:14:22.475847+00	2026-07-30 15:29:25.527+00
e1111111-1111-1111-1111-111111111102	jogos-pg	Jogos da PG	jogos_pg	9	t	provider/pgsoft	f	2026-07-12 22:04:53.917806+00	2026-07-30 15:29:25.527+00
e1111111-1111-1111-1111-111111111104	jogos-turbo	Cassino ao vivo	jogos_turbo	4	t	/provider/oficial-evolution-live	t	2026-07-12 22:04:53.917806+00	2026-07-30 15:29:25.527+00
e1111111-1111-1111-1111-111111111105	estudios	Estúdios	estudios	10	t	/providers	f	2026-07-12 22:04:53.917806+00	2026-07-30 15:29:25.527+00
e1111111-1111-1111-1111-111111111103	jogos-mesa	Jogos Crash	jogos_mesa	5	t	provider/oficial-aviatrix	f	2026-07-12 22:04:53.917806+00	2026-07-30 15:29:25.527+00
d4767bf6-0345-444e-a8c0-d3aaf9c3c720	teste	Jogos de Roleta	jogos_pg	7	t	provider/oficial-evolution-live	f	2026-07-30 15:09:41.843654+00	2026-07-30 15:29:25.527+00
b82c8519-a201-4815-bb8a-5c4c2b8c16ae	jogos-pg-2	Jogos Sortudos	jogos_pg	6	t	games	f	2026-07-30 15:29:14.205496+00	2026-07-30 15:30:43.108+00
cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	lancamento	Lançamento	jogos_pg	3	t	games	f	2026-07-30 15:24:24.557016+00	2026-07-30 15:32:12.171+00
e1111111-1111-1111-1111-111111111101	recomendados	Recomendados	recomendados	1	t	\N	f	2026-07-12 22:04:53.917806+00	2026-07-30 15:29:25.527+00
e1111111-1111-1111-1111-111111111106	jogos-semana	🥇 Maiores Pagantes	jogos_semana	2	t	/games	f	2026-07-14 00:33:00.168097+00	2026-07-30 15:29:25.527+00
\.


ALTER TABLE public.home_sections ENABLE TRIGGER ALL;

--
-- Data for Name: home_section_games; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.home_section_games DISABLE TRIGGER ALL;

COPY public.home_section_games (id, section_id, api_provider_id, game_code, game_name, game_image_url, provider_name, ordem, created_at, updated_at) FROM stdin;
8c97aad2-7d77-4fb9-9d9e-f9e9617165e7	e1111111-1111-1111-1111-111111111102	1	98	Fortune Ox	https://imagensfivers.com/Games/PG-Soft/PGS_98.webp	PGSOFT	1	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
fbd7142e-3fa2-43e6-a9ae-12e20607fd02	e1111111-1111-1111-1111-111111111102	1	68	Fortune Mouse	https://imagensfivers.com/Games/PG-Soft/PGS_68.webp	PGSOFT	2	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
8f95495e-3f92-420d-b5c2-fd2b1995ac7e	e1111111-1111-1111-1111-111111111102	1	126	Fortune Tiger	https://imagensfivers.com/Games/PG-Soft/PGS_126.webp	PGSOFT	3	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
f6adefbb-bacc-4286-ae43-16ae4e917aa9	e1111111-1111-1111-1111-111111111102	1	40	Jungle Delight	https://imagensfivers.com/Games/PG-Soft/PGS_40.webp	PGSOFT	4	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
adf3acca-e211-460e-b969-4246838311ee	e1111111-1111-1111-1111-111111111102	1	69	Bikini Paradise	https://imagensfivers.com/Games/PG-Soft/PGS_69.webp	PGSOFT	5	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
3b8fefa0-f010-40af-8d6a-266607a46830	e1111111-1111-1111-1111-111111111102	1	1695365	Fortune Dragon	https://imagensfivers.com/Games/PG-Soft/PGS_1695365.webp	PGSOFT	6	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
0d52516e-3443-4b6b-8eda-84c926486afc	e1111111-1111-1111-1111-111111111102	1	1738001	Chicky Run	https://imagensfivers.com/Games/PG-Soft/PGS_1738001.webp	PGSOFT	7	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
9540c9b3-1b56-4ebf-8539-bd5642366314	e1111111-1111-1111-1111-111111111102	1	39	Piggy Gold	https://imagensfivers.com/Games/PG-Soft/PGS_39.webp	PGSOFT	8	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
2299e063-1f29-49bd-9f64-68e6ba91c4b3	e1111111-1111-1111-1111-111111111102	1	63	Dragon Tiger Luck	https://imagensfivers.com/Games/PG-Soft/PGS_63.webp	PGSOFT	9	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
d05970b2-31c8-41d0-ac7d-171af6c19a09	e1111111-1111-1111-1111-111111111102	1	60	Leprechaun Riches	https://imagensfivers.com/Games/PG-Soft/PGS_60.webp	PGSOFT	10	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
8c875f3c-7fb9-4ada-8884-b2f8468e9b0d	e1111111-1111-1111-1111-111111111102	1	42	Ganesha Gold	https://imagensfivers.com/Games/PG-Soft/PGS_42.webp	PGSOFT	11	2026-07-17 13:23:14.58954+00	2026-07-17 13:23:14.509+00
0ddd7a80-690e-4def-84a5-490a31499729	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs20olympgate	Gates of Olympus	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs20olympgate.webp	PRAGMATIC	1	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
8caea233-30e0-44b5-b50b-1dcf94f01fc6	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs20fruitsw	Sweet Bonanza	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs20fruitsw.webp	PRAGMATIC	2	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
1f2f8fc8-776a-4c7d-b082-80fbe3f62b19	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs10bbhas	Big Bass Bonanza - Hold & Spinner	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs10bbhas.webp	PRAGMATIC	3	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
d09801af-cb47-4839-affb-1ccee20834d5	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs10carpbbbnz	Gold Carp Bonanza	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs10carpbbbnz.webp	PRAGMATIC	4	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
379d6d30-d814-40ee-8f0d-9467bd5b5f95	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vswayspizza	Pizza！Pizza？Pizza！	https://imagensfivers.com/Games/Pragmatic-Play/PP_vswayspizza.webp	PRAGMATIC	5	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
bb75c071-9a7a-458a-9a2b-3ab16a08b981	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs20sugarrush	Sugar Rush	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs20sugarrush.webp	PRAGMATIC	6	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
57a37488-67f4-49b4-a5b4-e2bf63d89d42	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs10txbigbass	Big Bass Splash	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs10txbigbass.webp	PRAGMATIC	7	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
17198403-bc6b-4b4a-a0f2-87f977338736	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs20hburnhs	Hot to Burn Hold and Spin	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs20hburnhs.webp	PRAGMATIC	8	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
5e715b0b-9d5d-42f1-bf02-07a5d4ed3d98	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs10cowgold	Cowboys Gold	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs10cowgold.webp	PRAGMATIC	9	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
653efcf2-34cc-446e-bff7-5f9efd959a7b	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs10firestrike	Fire Strike	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs10firestrike.webp	PRAGMATIC	10	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
410ff912-eae1-4809-9abc-73d4cffa8fbc	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	16	133	Good Fortune M	https://imagensfivers.com/Games/Cq9/133.webp	CQ9	1	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
7d08374f-8fb5-43f5-993b-3c58f3a9a3da	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	16	136	Running Animals	https://imagensfivers.com/Games/Cq9/136.webp	CQ9	2	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
c843658d-124a-4704-8e54-517b6cc3a435	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	16	131	Fa Cai Shen M	https://imagensfivers.com/Games/Cq9/131.webp	CQ9	3	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
398115d3-6d97-4111-b40a-d481cf4b395b	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	16	13	Sakura Legend	https://imagensfivers.com/Games/Cq9/13.webp	CQ9	4	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
066e0cd5-3572-4db0-9fcb-5bbcac711913	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	16	12	Treasure House	https://imagensfivers.com/Games/Cq9/12.webp	CQ9	5	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
5946f4a1-f73d-45ac-be04-e2ad8a5038ad	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	12	GoldenClaw	GoldenClaw	https://imagensfivers.com/Games/Toptrend/GoldenClaw.webp	TOPTREND	6	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
446db6b4-6f12-471e-9926-d40a06013149	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	12	Huluwa	Huluwa	https://imagensfivers.com/Games/Toptrend/Huluwa.webp	TOPTREND	7	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
14459535-49a6-412f-9a9c-13960f3a37af	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	12	LuckyPandaH5	LuckyPanda	https://imagensfivers.com/Games/Toptrend/LuckyPandaH5.webp	TOPTREND	8	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
f257959c-66c8-4e64-b593-0f24813870ff	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	83	SPB_trader	Trader	https://imagensfivers.com/Games/Spribe/SPB_trader.webp	OFICIAL - SPRIBE	9	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
7c47d5fe-4450-48da-8736-dcfe57172ba7	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	115	PP_2201	High Flyer	https://imagensfivers.com/Games/Pragmatic-Live/PP_2201.webp	OFICIAL - PRAGMATIC LIVE	10	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
5c037399-3bfc-4d6d-9d49-6ae3ae1137c0	cb5d9f44-e3b8-4c70-a5b8-81ed743ea2f5	1	1418544	Bakery Bonanza	https://imagensfivers.com/Games/PG-Soft/PGS_1418544.webp	PGSOFT	11	2026-07-30 15:26:59.001208+00	2026-07-30 15:26:58.271+00
8228e94d-f51a-45f0-811b-7f4fe923cbb2	e1111111-1111-1111-1111-111111111106	900001	aviator	Aviator	/assets/games/aviator.gif	Spribe	1	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
7c4c04c7-b5c4-4e84-a08b-2ec93fb67c3f	e1111111-1111-1111-1111-111111111106	72	GPKEVO_ed1d929364d67d15bcbb855b77fbf112	Bac Bo	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_ed1d929364d67d15bcbb855b77fbf112.webp	OFICIAL - EVOLUTION LIVE	2	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
c62db613-0486-472f-b04a-9bebc2033a9d	e1111111-1111-1111-1111-111111111106	72	GPKEVO_c74c4cfae894425d5d34da33f16a1757	Roleta Ao Vivo	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_c74c4cfae894425d5d34da33f16a1757.webp	OFICIAL - EVOLUTION LIVE	3	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
a459d657-0d1c-4d08-a27a-5995503e439f	e1111111-1111-1111-1111-111111111106	2	vs20fruitsw	Sweet Bonanza	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs20fruitsw.webp	PRAGMATIC	4	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
4eb9f31c-9270-47c3-bce4-abbf07f5ec54	e1111111-1111-1111-1111-111111111106	2	vs20olympgate	Gates of Olympus	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs20olympgate.webp	PRAGMATIC	5	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
cc6099e6-15a3-45bf-83bc-3b7cdf8514b5	e1111111-1111-1111-1111-111111111106	103	AVIA_aviatrix-fruits	Aviatrix Fruits	https://imagensfivers.com/Games/Aviatrix/AVIA_aviatrix-fruits.webp	OFICIAL - AVIATRIX	6	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
6506a442-5e6c-4003-80cf-f5116e56c736	e1111111-1111-1111-1111-111111111106	103	AVIA_nft-aviatrix	Aviatrix	https://imagensfivers.com/Games/Aviatrix/AVIA_nft-aviatrix.webp	OFICIAL - AVIATRIX	7	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
ffe8b610-c772-4b01-9251-070bcb7ce7a4	e1111111-1111-1111-1111-111111111106	1	126	Fortune Tiger	https://imagensfivers.com/Games/PG-Soft/PGS_126.webp	PGSOFT	8	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
54be4b68-154b-45a5-8463-d17bdaddbf7a	e1111111-1111-1111-1111-111111111106	1	1695365	Fortune Dragon	https://imagensfivers.com/Games/PG-Soft/PGS_1695365.webp	PGSOFT	9	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
aaf40db5-2987-495d-9034-2e6fb8626fd7	e1111111-1111-1111-1111-111111111106	116	vs5luckym	Macaco Sortudo	https://imagensfivers.com/Games/Fatpanda/vs5luckym.webp	FATPANDA	10	2026-07-30 14:51:25.080342+00	2026-07-30 14:51:24.383+00
fc03e518-b2cc-4b6c-9508-513b0ff2bf03	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_002f1c169f987367a76460647f4d38f5	Roulette	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_002f1c169f987367a76460647f4d38f5.webp	OFICIAL - EVOLUTION LIVE	1	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
0403cb88-c2e5-4ab7-a41b-0b2b242786e7	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_00908690859fbfe1980b8d4489126532	Auto-Roulette VIP	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_00908690859fbfe1980b8d4489126532.webp	OFICIAL - EVOLUTION LIVE	2	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
e0c1d247-8319-4c9d-8ef7-03e1c63c4c00	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_215600c11bf99524d14f1f17fd4c69f9	ROULETTE LOBBY	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_215600c11bf99524d14f1f17fd4c69f9.webp	OFICIAL - EVOLUTION LIVE	3	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
26883ba7-6d9e-46f9-9137-b425051184fd	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_c74c4cfae894425d5d34da33f16a1757	Roleta Ao Vivo	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_c74c4cfae894425d5d34da33f16a1757.webp	OFICIAL - EVOLUTION LIVE	4	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
faced307-b0cc-4273-ad44-576f2a794ddf	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_9722efbbe4b6e43400c617cff43310a2	Roleta Relâmpago	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_9722efbbe4b6e43400c617cff43310a2.webp	OFICIAL - EVOLUTION LIVE	5	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
43a336d6-ed84-43d2-be25-a2d6cca3157b	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_092c7bff9ba855729a50437ba683a26e	Bucharest Roulette	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_092c7bff9ba855729a50437ba683a26e.webp	OFICIAL - EVOLUTION LIVE	6	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
3f1f3c23-fdb0-4af4-88e1-3dd210ed936b	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_12cf16f4c84499650d48223bdb9e5115	London Roulette	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_12cf16f4c84499650d48223bdb9e5115.webp	OFICIAL - EVOLUTION LIVE	7	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
6820e910-a295-44be-85df-8c5f288a1116	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_13797e7af2005190b8a91936a25e5b7b	Salon Privé Roulette	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_13797e7af2005190b8a91936a25e5b7b.webp	OFICIAL - EVOLUTION LIVE	8	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
357e19a7-cbd3-42db-a1bc-6ba2e62c2990	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_1549acfc4e2ca79a06bceb14700a6639	Speed Roulette	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_1549acfc4e2ca79a06bceb14700a6639.webp	OFICIAL - EVOLUTION LIVE	9	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
f3ff2b2d-1eb9-45db-90b5-875a93251453	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_2787ca2f6ab3c823a9c74f1956c5ac9b	French Roulette Gold	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_2787ca2f6ab3c823a9c74f1956c5ac9b.webp	OFICIAL - EVOLUTION LIVE	10	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
378fa131-5d74-4c49-b52f-7e881dca0186	d4767bf6-0345-444e-a8c0-d3aaf9c3c720	72	GPKEVO_2bedbdb05d173727e5054be7661b9688	XXXTreme Lightning Roulette	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_2bedbdb05d173727e5054be7661b9688.webp	OFICIAL - EVOLUTION LIVE	11	2026-07-30 15:10:49.423142+00	2026-07-30 15:10:48.714+00
4e8beaba-78f8-407e-b403-2dcfdb4e8ce0	6fe284e1-2a90-4654-9765-73c3b7a66799	2	vs15diamond	Diamond Strike	https://imagensfivers.com/Games/Pragmatic-Play/PP_vs15diamond.webp	PRAGMATIC	11	2026-07-30 15:18:46.170059+00	2026-07-30 15:18:45.448+00
144b0a90-6f4b-45e7-9712-84920dc4e5f8	e1111111-1111-1111-1111-111111111103	900001	aviator	Aviator	/assets/games/aviator.gif	Spribe	1	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
06db7f77-79b9-4183-9a12-7bbf324a75ec	e1111111-1111-1111-1111-111111111103	115	PP_1301	Spaceman	https://imagensfivers.com/Games/Pragmatic-Live/PP_1301.webp	OFICIAL - PRAGMATIC LIVE	2	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
488637d1-2d00-49a2-af1f-3d7c820e08a3	e1111111-1111-1111-1111-111111111103	103	AVIA_nft-aviatrix	Aviatrix	https://imagensfivers.com/Games/Aviatrix/AVIA_nft-aviatrix.webp	OFICIAL - AVIATRIX	3	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
c21498d2-95f8-4146-8669-26c72123f59a	e1111111-1111-1111-1111-111111111103	103	AVIA_aviatrix-fruits	Aviatrix Fruits	https://imagensfivers.com/Games/Aviatrix/AVIA_aviatrix-fruits.webp	OFICIAL - AVIATRIX	4	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
4686f2d0-329b-4a50-9586-f2f7d7201f3e	e1111111-1111-1111-1111-111111111103	103	AVIA_second-chance	Aviatrix Second Chance	https://imagensfivers.com/Games/Aviatrix/AVIA_second-chance.webp	OFICIAL - AVIATRIX	5	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
8dbc7424-8388-4f06-a7de-d29f197e5137	e1111111-1111-1111-1111-111111111103	83	SPB_balloon	Balloon	https://imagensfivers.com/Games/Spribe/SPB_balloon.webp	OFICIAL - SPRIBE	6	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
3fbe39ed-be69-446d-85e5-d554905a938a	e1111111-1111-1111-1111-111111111103	83	SPB_trader	Trader	https://imagensfivers.com/Games/Spribe/SPB_trader.webp	OFICIAL - SPRIBE	7	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
91a1fe58-9c3c-4c5b-aefc-3702da5e8069	e1111111-1111-1111-1111-111111111103	115	PP_2201	High Flyer	https://imagensfivers.com/Games/Pragmatic-Live/PP_2201.webp	OFICIAL - PRAGMATIC LIVE	8	2026-07-30 15:07:47.303632+00	2026-07-30 15:07:46.596+00
3c31ee0a-9969-4645-ae3c-aac2a1bb676e	e1111111-1111-1111-1111-111111111104	72	GPKEVO_ed1d929364d67d15bcbb855b77fbf112	Bac Bo	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_ed1d929364d67d15bcbb855b77fbf112.webp	OFICIAL - EVOLUTION LIVE	1	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
3961c106-bb36-4a66-bdc9-3c8931d37040	e1111111-1111-1111-1111-111111111104	72	GPKEVO_c74c4cfae894425d5d34da33f16a1757	Roleta Ao Vivo	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_c74c4cfae894425d5d34da33f16a1757.webp	OFICIAL - EVOLUTION LIVE	2	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
687c4927-80a0-4bd6-a504-ace870f4e057	e1111111-1111-1111-1111-111111111104	72	GPKEVO_80fe74c2603763a936f9be68dad07aa9	First Person Football Studio	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_80fe74c2603763a936f9be68dad07aa9.webp	OFICIAL - EVOLUTION LIVE	3	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
96fa341a-d54a-4565-9541-51d3753302d3	e1111111-1111-1111-1111-111111111104	72	GPKEVO_c605e257bc20ba94849999cdc3007f72	Bacará Rápido	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_c605e257bc20ba94849999cdc3007f72.webp	OFICIAL - EVOLUTION LIVE	4	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
1a862e49-0575-481c-bf99-03fac0c32966	e1111111-1111-1111-1111-111111111104	72	GPKEVO_140ff6d088b2c7b0c8cfae3baca1c938	Blackjack Classic 35	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_140ff6d088b2c7b0c8cfae3baca1c938.webp	OFICIAL - EVOLUTION LIVE	5	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
306a5a6a-af63-43f3-94f1-06996cdbe427	e1111111-1111-1111-1111-111111111104	115	PP_2750	Money Time	https://imagensfivers.com/Games/Pragmatic-Live/PP_2750.webp	OFICIAL - PRAGMATIC LIVE	6	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
86e8808d-4aff-4e28-aa10-05c291a54a28	e1111111-1111-1111-1111-111111111104	72	GPKEVO_104365e3cab532997f11b59212aabae6	Crazy Balls	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_104365e3cab532997f11b59212aabae6.webp	OFICIAL - EVOLUTION LIVE	7	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
22ef3efe-a395-4176-8fa1-d3c534a88a4e	e1111111-1111-1111-1111-111111111104	72	GPKEVO_29ed052f0aec9874f05724616edc6841	Crazy Time Brasil	https://imagensfivers.com/Games/Evolution-Live/GPKEVO_29ed052f0aec9874f05724616edc6841.webp	OFICIAL - EVOLUTION LIVE	8	2026-07-30 15:27:36.881225+00	2026-07-30 15:27:36.156+00
f9c7336a-0724-47af-a9ba-f51a2f408dc9	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs5luckym	Macaco Sortudo	https://imagensfivers.com/Games/Fatpanda/vs5luckym.webp	FATPANDA	1	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
06355f14-fce3-4e6d-9f83-9d22c551ffeb	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs10fortnhs	Touro Sortudo	https://imagensfivers.com/Games/Fatpanda/vs10fortnhs.webp	FATPANDA	2	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
fd3e72cd-576e-40e5-81ed-db208f6fd5f2	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs5luckytig	Tigre Sortudo	https://imagensfivers.com/Games/Fatpanda/vs5luckytig.webp	FATPANDA	3	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
9fcdf8bb-1580-4617-a7e5-cd9437c2e058	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs10forwild	Rato Sortudo	https://imagensfivers.com/Games/Fatpanda/vs10forwild.webp	FATPANDA	4	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
a04956bf-4dfa-4ca8-9d05-acc9de246a27	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs5luckydog	Cachorro Sortudo	https://imagensfivers.com/Games/Fatpanda/vs5luckydog.webp	FATPANDA	5	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
400b7002-1249-4de8-88fe-5ca9a54e7894	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs5luckytig1k	Tigre Sortudo 1000	https://imagensfivers.com/Games/Fatpanda/vs5luckytig1k.webp	FATPANDA	6	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
d7628207-6bab-4c68-bfb3-ee38cb3cc0b0	b82c8519-a201-4815-bb8a-5c4c2b8c16ae	116	vs5luckyphn	Fenix Sortuda	https://imagensfivers.com/Games/Fatpanda/vs5luckyphn.webp	FATPANDA	7	2026-07-30 15:30:05.150171+00	2026-07-30 15:30:04.376+00
\.


ALTER TABLE public.home_section_games ENABLE TRIGGER ALL;

--
-- Data for Name: home_section_providers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.home_section_providers DISABLE TRIGGER ALL;

COPY public.home_section_providers (id, section_id, api_provider_id, provider_name, provider_image_url, ordem, created_at, updated_at) FROM stdin;
12375a5d-f9ff-4cde-83b4-0662c84146d4	e1111111-1111-1111-1111-111111111105	900001	Spribe	/assets/providers/spribe.webp	1	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
a03a5d8f-cdae-4321-81c8-50bcdb5ca763	e1111111-1111-1111-1111-111111111105	1	PGSOFT	https://imagensfivers.com/Provedores/PGSOFT.webp	2	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
5b0e626a-772e-4b9d-a472-f2b01ad5a780	e1111111-1111-1111-1111-111111111105	7	HABANERO	https://imagensfivers.com/Provedores/HABANERO.webp	3	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
2bc53d58-2958-489b-9789-17067be89123	e1111111-1111-1111-1111-111111111105	14	EVOPLAY	https://imagensfivers.com/Provedores/EVOPLAY.webp	4	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
4fe78257-7fd9-42a4-ae2b-a870bb2088a6	e1111111-1111-1111-1111-111111111105	13	DREAMTECH	https://imagensfivers.com/Provedores/DREAMTECH.webp	5	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
fb3cf520-1ee9-41f7-9190-437da00637c2	e1111111-1111-1111-1111-111111111105	12	TOPTREND	https://imagensfivers.com/Provedores/TOPTREND.webp	6	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
07d0ed67-5cdf-4326-bc5f-e9950e00369c	e1111111-1111-1111-1111-111111111105	10	PLAYSON	https://imagensfivers.com/Provedores/PLAYSON.webp	7	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
820c0337-930f-434d-89d6-cf0108ffa0e8	e1111111-1111-1111-1111-111111111105	17	REELKINGDOM	https://imagensfivers.com/Provedores/REELKINGDOM.webp	8	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
88402af5-0994-433f-b368-6269e3405e1f	e1111111-1111-1111-1111-111111111105	16	CQ9	https://imagensfivers.com/Provedores/CQ9.webp	9	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
908f2567-6894-48ef-bbfd-8691b96d3e5c	e1111111-1111-1111-1111-111111111105	15	BOOONGO	https://imagensfivers.com/Provedores/BOOONGO.webp	10	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
13e07aa2-1460-4484-92cf-914e20c0cff1	e1111111-1111-1111-1111-111111111105	2	PRAGMATIC	https://imagensfivers.com/Provedores/PRAGMATIC-SLOTS.webp	11	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
ac96ad73-6a20-41b4-9b2a-be130d97ee1c	e1111111-1111-1111-1111-111111111105	131	RUBYPLAY	https://imagensfivers.com/Provedores/RUBYPLAY.webp	12	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
add7a1bd-063f-4c51-943b-c483933a6ed0	e1111111-1111-1111-1111-111111111105	126	AMUSNET	https://imagensfivers.com/Provedores/AMUSNET.webp	13	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
7f5314f3-de31-4ef8-a809-770ed663826a	e1111111-1111-1111-1111-111111111105	127	EGT	https://imagensfivers.com/Provedores/EGT.webp	14	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
dc244c47-e8b2-4480-a14e-8c39419d1c0b	e1111111-1111-1111-1111-111111111105	128	SPADEGAMING	https://imagensfivers.com/Provedores/SPADEGAMING.webp	15	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
f9eb1919-ab11-4817-ae6f-d364f3eebc0e	e1111111-1111-1111-1111-111111111105	129	FASTSPIN	https://imagensfivers.com/Provedores/FASTSPIN.webp	16	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
c42a9ddf-fdf3-4b13-9577-f671dac205ac	e1111111-1111-1111-1111-111111111105	125	PLAYNGO	https://imagensfivers.com/Provedores/PLAYNGO.webp	17	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
151124c2-2ad3-420b-9ce4-176552bdc2a6	e1111111-1111-1111-1111-111111111105	124	FACHAI	https://imagensfivers.com/Provedores/FACHAI.webp	18	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
6e08931f-f904-4547-adde-ae7bf33cb36c	e1111111-1111-1111-1111-111111111105	123	HACKSAW	https://imagensfivers.com/Provedores/HACKSAW.webp	19	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
eac3647d-ef45-496d-843d-9a8e1b71be0f	e1111111-1111-1111-1111-111111111105	122	JILI	https://imagensfivers.com/Provedores/JILI.webp	20	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
1d67dfb4-10ee-4aa7-830b-a4fb9272855c	e1111111-1111-1111-1111-111111111105	107	OFICIAL - DREAMGAMING LIVE	https://imagensfivers.com/Provedores/DREAMGAMING-LIVE.webp	21	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
2f9490ab-2596-4570-a8fb-0cae238e6aa0	e1111111-1111-1111-1111-111111111105	115	OFICIAL - PRAGMATIC LIVE	https://imagensfivers.com/Provedores/PRAGMATIC-LIVE.webp	22	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
7faf7669-c614-49ea-aa11-6b9ac76fbd37	e1111111-1111-1111-1111-111111111105	116	FATPANDA	https://imagensfivers.com/Provedores/FATPANDA.webp	23	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
e8aba848-cf5a-49f0-bb31-5e785baa5a97	e1111111-1111-1111-1111-111111111105	121	TADA	https://imagensfivers.com/Provedores/TADA.webp	24	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
7338decd-78df-4803-a2cc-7e4897fd8f0a	e1111111-1111-1111-1111-111111111105	72	OFICIAL - EVOLUTION LIVE	https://imagensfivers.com/Provedores/EVOLUTION-LIVE.webp	25	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
b5692d2c-6a53-45d5-a25c-3265e67ae536	e1111111-1111-1111-1111-111111111105	103	OFICIAL - AVIATRIX	https://imagensfivers.com/Provedores/AVIATRIX.webp	26	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
25955199-e309-4bf5-a5e7-fa768f151f92	e1111111-1111-1111-1111-111111111105	81	OFICIAL - QUEENMAKER	https://imagensfivers.com/Provedores/QUEENMAKER.webp	27	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
03b08526-6349-4ed0-8de6-1052e26e8d6d	e1111111-1111-1111-1111-111111111105	73	OFICIAL - EZUGI	https://imagensfivers.com/Provedores/EZUGI.webp	28	2026-07-30 15:16:59.09596+00	2026-07-30 15:16:58.373+00
\.


ALTER TABLE public.home_section_providers ENABLE TRIGGER ALL;

--
-- Data for Name: integration_secrets; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.integration_secrets DISABLE TRIGGER ALL;

COPY public.integration_secrets (id, misticpay_ci, misticpay_cs, misticpay_api_url, misticpay_webhook_secret, updated_at, payment_gateway, bspay_client_id, bspay_client_secret, bspay_signing_key, bspay_webhook_secret, bspay_api_url, veopag_client_id, veopag_client_secret, veopag_webhook_secret, veopag_api_url, payment_gateway_deposit, payment_gateway_withdraw) FROM stdin;
1	ci_4daeeuwm3cbjwby	cs_d8j1r2qdfrnif3xawnfecbam2	https://api.misticpay.com/api	sdfgfdg	2026-07-29 16:25:15.027863+00	veopag	stewgaming_fa51973c5260e1c0	efcefe4e4afe7242c54f0f853f3085eff4cd70f609256682422db96d3235122a	172.31.14.202		https://api.bspay.co	cli_d388c84c7ebdd1b8cd1b1e3b819cd8af	BtnQ5VoLarSuIhiwtee19CvcAOehk0F7Gq66z1rOpr9evp3e2BuNPA6VOfXbGlQ7Xc7Extys0Ie5m-QklPWjyO4Zfsyo7CJXiSYd		https://api.veopag.com	veopag	misticpay
\.


ALTER TABLE public.integration_secrets ENABLE TRIGGER ALL;

--
-- Data for Name: platform_providers; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.platform_providers DISABLE TRIGGER ALL;

COPY public.platform_providers (api_provider_id, slug, nome, image_url, api_status, ativo, created_at, updated_at) FROM stdin;
118	popok	POPOK	e	1	f	2026-07-14 13:12:03.52343+00	2026-07-14 13:12:02.733+00
123	hacksaw	HACKSAW	e	1	f	2026-07-14 13:12:10.248962+00	2026-07-14 13:12:09.469+00
122	jili	JILI	e	1	f	2026-07-14 13:12:07.017842+00	2026-07-14 13:12:10.643+00
127	egt	EGT	e	1	f	2026-07-14 13:12:12.723937+00	2026-07-14 13:12:11.956+00
129	fastspin	FASTSPIN	e	1	f	2026-07-14 13:12:14.960463+00	2026-07-14 13:12:14.194+00
131	rubyplay	RUBYPLAY	e	1	f	2026-07-14 13:12:16.148947+00	2026-07-14 13:12:15.375+00
128	spadegaming	SPADEGAMING	e	1	f	2026-07-14 13:12:17.494001+00	2026-07-14 13:12:16.722+00
126	amusnet	AMUSNET	e	1	f	2026-07-14 13:12:19.29044+00	2026-07-14 13:12:18.519+00
125	playngo	PLAYNGO	e	1	f	2026-07-14 13:12:23.666005+00	2026-07-14 13:12:22.888+00
124	fachai	FACHAI	e	1	f	2026-07-14 13:12:25.291289+00	2026-07-14 13:12:24.519+00
900001	propria	Propria		1	t	2026-07-14 16:41:45.138151+00	2026-07-14 16:42:51.175+00
121	tada	TADA	e	1	t	2026-07-14 13:12:05.252879+00	2026-07-17 09:27:21.771+00
1	pgsoft	PGSOFT	https://imagensfivers.com/Provedores/PGSOFT.webp	1	t	2026-07-14 13:05:51.985715+00	2026-07-17 15:46:17.349+00
81	oficial-queenmaker	OFICIAL - QUEENMAKER	https://imagensfivers.com/Provedores/QUEENMAKER.webp	1	t	2026-07-21 23:08:09.389195+00	2026-07-21 23:08:08.666+00
83	oficial-spribe	OFICIAL - SPRIBE	https://imagensfivers.com/Provedores/SPRIBE.webp	1	t	2026-07-21 23:02:53.977169+00	2026-07-29 03:48:48.221+00
\.


ALTER TABLE public.platform_providers ENABLE TRIGGER ALL;

--
-- Data for Name: platform_games; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.platform_games DISABLE TRIGGER ALL;

COPY public.platform_games (id, api_provider_id, game_code, nome, image_url, api_status, ativo, created_at, updated_at) FROM stdin;
d41ad6ad-7ff0-4201-9a97-12513f00518f	1	126	Fortune Tiger	https://imagensfivers.com/Games/PG-Soft/PGS_126.webp	t	t	2026-07-14 13:06:09.461952+00	2026-07-14 16:22:24.086+00
06413c7e-4038-434e-95e5-4e19709bf9c8	900001	aviator	Aviator	https://imagensfivers.com/Games/Spribe/Aviator.webp	t	t	2026-07-14 16:41:49.164827+00	2026-07-14 16:41:47.986+00
64deb523-de3b-41af-9f4b-44dce50671b8	1	1340277	Asgardian Rising	https://imagensfivers.com/Games/PG-Soft/PGS_1340277.webp	t	f	2026-07-17 15:46:17.798553+00	2026-07-17 15:46:17.45+00
f1d3111b-6ea3-48d5-b9ff-9340693d8340	81	QM_KMQM_Elite_Aviator_Club	Elite Aviator Club	https://imagensfivers.com/Games/QueenMaker/QM_KMQM_Elite_Aviator_Club.webp	t	f	2026-07-21 23:08:09.504815+00	2026-07-21 23:08:08.791+00
3ce9827f-944e-4a2f-a82f-d8ee4741d010	83	SPB_goal	Goal	https://imagensfivers.com/Games/Spribe/SPB_goal.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
95a6078c-f51e-4c80-a657-dfe6ea7d76bd	83	SPB_dice	Dice	https://imagensfivers.com/Games/Spribe/SPB_dice.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
ec18b2d0-3fb4-4059-951a-e9976a5c1c70	83	SPB_mines	Mines	https://imagensfivers.com/Games/Spribe/SPB_mines.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
84a2e142-23ee-413f-ab21-0bc0c221992e	83	SPB_hi-lo	Hilo	https://imagensfivers.com/Games/Spribe/SPB_hi-lo.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
d8a85146-4c58-44af-bcc3-21511dcd9150	83	SPB_keno	Keno	https://imagensfivers.com/Games/Spribe/SPB_keno.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
2b8ad051-4ab0-4caa-871d-ac087c5ae993	83	SPB_mini-roulette	Mini Roulette	https://imagensfivers.com/Games/Spribe/SPB_mini-roulette.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
aa48328a-3dc4-42a4-8c73-273c169a4d50	83	SPB_hotline	Hotline	https://imagensfivers.com/Games/Spribe/SPB_hotline.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
6f7b1723-7292-426d-91b2-f5dd42ab7dbe	83	SPB_multikeno	Keno 80	https://imagensfivers.com/Games/Spribe/SPB_multikeno.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
64aad7b2-5d54-45b3-937a-2bfec5867d9c	83	SPB_balloon	Balloon	https://imagensfivers.com/Games/Spribe/SPB_balloon.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
2adc48be-67f0-47df-8691-c330e219a71d	83	SPB_trader	Trader	https://imagensfivers.com/Games/Spribe/SPB_trader.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
249178a9-850f-455f-94c6-d92c586395c7	83	SPB_pilot-chicken	Pilot Chicken	https://imagensfivers.com/Games/Spribe/SPB_pilot-chicken.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
419af99f-b2f8-4557-b1e8-dfdb900b5f85	83	SPB_aviator	Aviator	https://imagensfivers.com/Games/Spribe/SPB_aviator.webp	t	f	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
3bf6adda-eb65-4f66-b4a9-72080919fed4	83	SPB_plinko	Plinko	https://imagensfivers.com/Games/Spribe/SPB_plinko.webp	t	t	2026-07-21 23:02:53.977169+00	2026-07-22 16:39:03.836598+00
94424234-207f-4012-a745-f43dc2f98dbb	83	SPB_aviator2	Aviator	https://imagensfivers.com/Games/Spribe/SPB_aviator.webp	t	f	2026-07-29 03:48:49.874851+00	2026-07-29 03:48:48.369+00
\.


ALTER TABLE public.platform_games ENABLE TRIGGER ALL;

--
-- Data for Name: prize_wheel_config; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prize_wheel_config DISABLE TRIGGER ALL;

COPY public.prize_wheel_config (id, ativo, titulo_imagem_url, banner_imagem_url, roleta_imagem_url, centro_imagem_url, giros_por_periodo, cooldown_horas, created_at, updated_at, widget_imagem_url) FROM stdin;
1	t	https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69b332751671a_Camada%200.png	https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b9cff_SEU%20PR%C3%8AMIO%20URANO.png	https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5add7dcc9_URANO%20ROLETA.png	https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png	5	24	2026-07-13 17:25:29.102058+00	2026-07-30 14:43:02.834+00	https://i.imgur.com/IMLmEgM.png
\.


ALTER TABLE public.prize_wheel_config ENABLE TRIGGER ALL;

--
-- Data for Name: prize_wheel_segments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.prize_wheel_segments DISABLE TRIGGER ALL;

COPY public.prize_wheel_segments (id, nome_admin, label, cupom_id, peso, ordem, ativo, created_at, updated_at) FROM stdin;
aec5753e-cdda-4555-b579-ddc99c96b738	Segmento Gates of Olympus	85 Giros	373c7871-ff40-4158-b332-6187735b78b1	12	1	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
d47eafbd-cea1-4d54-9d75-dd1dd70bfa00	Segmento Starlight Princess	70 Giros	5ad047bd-eca3-41c2-b83b-f34ec1c6fc00	12	2	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
54d62f0a-a849-4c1c-9acb-51b49e44aee6	Segmento Sweet Bonanza	95 Giros	226bcfdb-cc58-4be8-aec7-a871b71e8a03	12	3	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
8d71742d-e21d-4174-8ce2-0559fd7082d3	Segmento Sugar Rush	65 Giros	0a587f91-33ec-434e-9c13-194f2b315c15	12	4	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
39d70e58-da00-4be1-aab7-12a34231ba63	Segmento Starlight 1000	55 Giros	c786864e-672f-4c79-a69a-be5e40f09066	10	5	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
8cb91442-a2c0-456e-9d6e-c458fb532994	Segmento Gates 1000	95 Giros	0e6230fa-12de-4d27-9a0e-f0202366cd42	10	6	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
4814c4f1-3275-48af-a13c-115a8570f7cd	Segmento Sweet 1000	100 Giros	e4c07e3c-99f5-48b1-9df6-6b2c91f830e0	10	7	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
f717e5e9-7fad-4d6b-850d-07641ccdbd41	Segmento Caramelo	65 Giros	bbf32eb0-db3a-4643-8425-f1c3c41ff2ae	10	8	t	2026-07-13 17:38:19.664579+00	2026-07-13 17:38:19.664579+00
\.


ALTER TABLE public.prize_wheel_segments ENABLE TRIGGER ALL;

--
-- Data for Name: site_config; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.site_config DISABLE TRIGGER ALL;

COPY public.site_config (id, header_fundo, header_logo_url, footer_fundo, home_fundo, sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, top_banner_ativo, top_banner_background_color, top_banner_emoji, top_banner_mensagem, top_banner_botao_texto, top_banner_botao_href, top_banner_botao_cor_fundo, top_banner_botao_cor_texto, top_banner_permitir_fechar, updated_at, deposito_minimo, deposito_maximo, saque_minimo, saque_maximo, saques_diarios_permitidos, rollover_padrao, sidebar_copy, login_modal_imagem_url, register_modal_imagem_url, indicacao_recompensa, indicacao_deposito_minimo, nome_bet, site_titulo, site_dominio, entry_popup_ativo, entry_popup_imagem_url, deposit_modal_imagem_url, brand_cor_primaria, brand_cor_hover, site_favicon_url, footer_instagram_ativo, footer_instagram_url, footer_telegram_ativo, footer_telegram_url, footer_whatsapp_ativo, footer_whatsapp_url, rollover_giros_gratis) FROM stdin;
1	#0f0f0f	https://i.ibb.co/h1s862ZJ/Design-sem-nome-1-removebg-preview.png	#0f0f0f	#000000	#000	#181923	#1c00a8	t	#1c00a8	📲	Confie na sua sorte, avance com cuidado e escape das bombas rumo á vitória!	Jogar Agora	https://google.com	#FFFFFF	#1c00a8	t	2026-07-30 14:25:39.187+00	10.00	5000.00	5.00	5000.00	2	2.00	\N	https://i.imgur.com/v9p8SAP.png	https://i.imgur.com/UJkouO5.png	15.00	10.00	StewGaming	StewGaming	stewgaming.com	f	https://images-ext-1.discordapp.net/external/LSgH1_DH3xLdU93L0sZjozCMT43WsXSsRt3g5IkCiZQ/https/royal-images.s3.us-east-1.amazonaws.com/venuzbet-com-images/images/1759855908826.png?format=webp&quality=lossless&width=774&height=968	https://i.imgur.com/V0PKD6M.png	#1c00a8	#1c00a8	https://i.ibb.co/fdrQtnFp/favicon.png	f	https://instagram.com/royalbet_oficial	f	https://t.me/royalbet_oficial	t	551192493593465	5.00
\.


ALTER TABLE public.site_config ENABLE TRIGGER ALL;

--
-- Data for Name: tracking_pixels; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.tracking_pixels DISABLE TRIGGER ALL;

COPY public.tracking_pixels (id, nome, pixel_id, plataforma, ativo, created_at, updated_at) FROM stdin;
d471e8a6-67d7-4264-9330-a7059c9ff152	teste	1482756086098897	facebook	t	2026-07-17 02:48:48.858404+00	2026-07-21 03:08:46.696096+00
6c20db53-fed5-49e8-b5c1-9bafddd8af05	Facebook Pixel	1507708100320295	facebook	t	2026-07-21 03:12:06.431676+00	2026-07-21 03:12:46.31896+00
\.


ALTER TABLE public.tracking_pixels ENABLE TRIGGER ALL;

--
-- Data for Name: vip_niveis; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.vip_niveis DISABLE TRIGGER ALL;

COPY public.vip_niveis (nivel, nome, grupo, subnivel, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor, created_at, updated_at) FROM stdin;
1	Bronze 1	bronze	1	0.00	0.00	0.00	https://cdn.royalbetsolutions.com/default/vip/bronze.webp	rgb(255, 146, 17)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
2	Bronze 2	bronze	2	100.00	0.00	0.00	https://cdn.royalbetsolutions.com/default/vip/bronze.webp	rgb(255, 146, 17)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
3	Bronze 3	bronze	3	300.00	0.00	0.00	https://cdn.royalbetsolutions.com/default/vip/bronze.webp	rgb(255, 146, 17)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
4	Prata 1	prata	1	600.00	0.30	5.00	https://cdn.royalbetsolutions.com/default/vip/prata.webp	rgb(192, 192, 192)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
5	Prata 2	prata	2	1000.00	0.40	10.00	https://cdn.royalbetsolutions.com/default/vip/prata.webp	rgb(192, 192, 192)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
6	Prata 3	prata	3	2000.00	0.50	15.00	https://cdn.royalbetsolutions.com/default/vip/prata.webp	rgb(192, 192, 192)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
7	Ouro 1	ouro	1	5000.00	0.80	25.00	https://cdn.royalbetsolutions.com/default/vip/ouro.webp	rgb(255, 192, 0)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
8	Ouro 2	ouro	2	10000.00	1.00	50.00	https://cdn.royalbetsolutions.com/default/vip/ouro.webp	rgb(255, 192, 0)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
9	Ouro 3	ouro	3	20000.00	1.20	100.00	https://cdn.royalbetsolutions.com/default/vip/ouro.webp	rgb(255, 192, 0)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
10	Rubi 1	rubi	1	35000.00	1.50	150.00	https://cdn.royalbetsolutions.com/default/vip/rubi.webp	rgb(255, 60, 55)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
11	Rubi 2	rubi	2	50000.00	1.80	250.00	https://cdn.royalbetsolutions.com/default/vip/rubi.webp	rgb(255, 60, 55)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
12	Rubi 3	rubi	3	75000.00	2.00	500.00	https://cdn.royalbetsolutions.com/default/vip/rubi.webp	rgb(255, 60, 55)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
13	Esmeralda 1	esmeralda	1	100000.00	2.50	750.00	https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp	rgb(2, 210, 106)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
14	Esmeralda 2	esmeralda	2	150000.00	3.00	1000.00	https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp	rgb(2, 210, 106)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
15	Esmeralda 3	esmeralda	3	250000.00	3.50	2000.00	https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp	rgb(2, 210, 106)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
16	Diamante 1	diamante	1	400000.00	5.00	3000.00	https://cdn.royalbetsolutions.com/default/vip/diamante.webp	rgb(11, 167, 254)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
17	Diamante 2	diamante	2	600000.00	6.50	5000.00	https://cdn.royalbetsolutions.com/default/vip/diamante.webp	rgb(11, 167, 254)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
18	Diamante 3	diamante	3	1000000.00	8.00	10000.00	https://cdn.royalbetsolutions.com/default/vip/diamante.webp	rgb(11, 167, 254)	2026-07-12 19:25:56.819163+00	2026-07-12 19:25:56.819163+00
\.


ALTER TABLE public.vip_niveis ENABLE TRIGGER ALL;

--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.webhooks DISABLE TRIGGER ALL;

COPY public.webhooks (id, nome, url, evento, secret_key, ativo, created_at, updated_at) FROM stdin;
bdf739a7-c700-49a7-9c4f-0fea4ac41e53	deposito confirmado	https://fluxlab.io/api/webhooks/3aeed3cc-0a6c-40ba-895e-5b4e116ca657	deposit.paid	b58dfea9f04133e1a10e8388bde2fff74efe8e24c868ab8d043cf51c0bd41b9d	t	2026-07-16 16:54:24.722104+00	2026-07-16 16:54:24.722104+00
941a4e3c-ccbf-44e2-8f97-bba41a4c25d6	cadastro	https://fluxlab.io/api/webhooks/511944ea-02bf-47e3-a962-bb6ca5119e38	user.register	560300771909b5767546c24d724699b4af5eb1c39c84f17394c2e4c99679e77c	t	2026-07-16 16:47:47.290126+00	2026-07-17 03:57:18.74252+00
c18b386f-86ec-4396-9d13-87deb7ef3264	gerou	https://fluxlab.io/api/webhooks/1a23da72-ed8a-4181-9a0f-0902138d76c0	deposit.created	2e00bb2a0959476c5bf8e8398620a01a37b843e385a51071ad46c1974cab51fa	t	2026-07-16 16:53:35.114747+00	2026-07-25 13:46:51.018807+00
8022edf6-3f65-4771-991c-b728e1ee2d50	teste	https://spark-of-white.lovable.app/api/public/webhooks/cadastro	user.register	c17db3cd2a9e4bb055317c9f76a37419868ec86b345f8d332fb5fc60b4316427	t	2026-08-03 01:22:24.613577+00	2026-08-03 01:22:24.613577+00
e0b996d6-9881-4672-bc1b-3b315b02f294	teste -2	https://spark-of-white.lovable.app/api/public/webhooks/qrcode	deposit.created	779bbdb3de3011ddd6300d5e299fa41386f9aa48fa7b311beb13bdac2cdfd1d2	t	2026-08-03 01:25:35.501777+00	2026-08-03 01:25:35.501777+00
\.


ALTER TABLE public.webhooks ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict ES373gT6X97ii3Q6oL3BtnCBE5xiuKM0wm8MmtiBQSlZtDhVObjCD2mYS9dwyBK

