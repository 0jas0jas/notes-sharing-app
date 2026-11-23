-- 03_seed.sql — starter McGill courses for the demo
-- Author: <your name>  (drafted with Claude: list in THIRD_PARTY.md)
-- Safe to re-run: existing codes are skipped. Add more rows as needed.

insert into public.courses (code, title) values
  ('COMP 202', 'Foundations of Programming'),
  ('COMP 206', 'Introduction to Software Systems'),
  ('COMP 250', 'Introduction to Computer Science'),
  ('COMP 251', 'Algorithms and Data Structures'),
  ('COMP 273', 'Introduction to Computer Systems'),
  ('COMP 302', 'Programming Languages and Paradigms'),
  ('COMP 303', 'Software Design'),
  ('COMP 307', 'Principles of Web Development'),
  ('COMP 330', 'Theory of Computation'),
  ('COMP 360', 'Algorithm Design'),
  ('COMP 421', 'Database Systems'),
  ('COMP 424', 'Artificial Intelligence'),
  ('COMP 551', 'Applied Machine Learning'),
  ('MATH 133', 'Linear Algebra and Geometry'),
  ('MATH 140', 'Calculus 1'),
  ('MATH 141', 'Calculus 2'),
  ('MATH 222', 'Calculus 3'),
  ('MATH 235', 'Algebra 1'),
  ('MATH 240', 'Discrete Structures'),
  ('MATH 323', 'Probability'),
  ('BIOL 112', 'Cell and Molecular Biology'),
  ('CHEM 110', 'General Chemistry 1'),
  ('PHYS 131', 'Mechanics and Waves'),
  ('ECON 208', 'Microeconomic Analysis and Applications'),
  ('PSYC 100', 'Introduction to Psychology')
on conflict (code) do nothing;
