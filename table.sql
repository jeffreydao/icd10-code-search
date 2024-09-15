-- public.icd_codes definition

-- Drop table

-- DROP TABLE public.icd_codes;

CREATE TABLE public.icd_codes (
	code varchar(10) NOT NULL,
	description text NOT NULL,
	category varchar(50) NULL,
	sub_category varchar(50) NULL,
	search_vector tsvector NULL,
	weighted_vector tsvector GENERATED ALWAYS AS (((setweight(to_tsvector('english'::regconfig, COALESCE(code, ''::character varying)::text), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(description, ''::text)), 'B'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(category, ''::character varying)::text), 'C'::"char")) || setweight(to_tsvector('english'::regconfig, COALESCE(sub_category, ''::character varying)::text), 'D'::"char")) STORED NULL,
	CONSTRAINT icd_codes_pkey PRIMARY KEY (code)
);
CREATE INDEX idx_fts_search ON public.icd_codes USING gin (search_vector);
CREATE INDEX idx_icd_codes_search ON public.icd_codes USING gin (to_tsvector('english'::regconfig, (((((((code)::text || ' '::text) || description) || ' '::text) || (category)::text) || ' '::text) || (sub_category)::text)));
CREATE INDEX weighted_vector_idx ON public.icd_codes USING gin (weighted_vector);