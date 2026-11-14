--
-- PostgreSQL database dump
--

\restrict 8SLwCz9UXKkim3abejhlsTf8naLhmSAhTgJb6KcaSxtmRjDtkdW7WwkWCWYrNAP

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.6

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    _id text NOT NULL,
    title text NOT NULL,
    description text,
    shortdescription text,
    technologies text[],
    githuburl text,
    liveurl text,
    imageurl text,
    featured boolean,
    status text,
    startdate date,
    enddate date,
    category text,
    createdat date,
    updatedat date,
    blogpost boolean,
    blogid text
);


--
-- Name: TABLE projects; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.projects IS 'Personal Projects completed by PughDev Software Solutions LLC';


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (_id);


--
-- Name: projects Enable read access for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for all users" ON public.projects FOR SELECT USING (true);


--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict 8SLwCz9UXKkim3abejhlsTf8naLhmSAhTgJb6KcaSxtmRjDtkdW7WwkWCWYrNAP

