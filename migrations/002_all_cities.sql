-- Clinics in every regional centre of Uzbekistan, not only the Fergana valley.
-- Keep in sync with src/lib/cities.ts.
alter table hs.clinics drop constraint if exists clinics_city_check;
alter table hs.clinics add constraint clinics_city_check check (city in (
  'tashkent','nurafshon','chirchiq','angren','olmaliq',
  'andijan','namangan','fergana','margilan','kokand',
  'samarkand','bukhara','navoi','karshi','shahrisabz','termez',
  'jizzakh','gulistan','urgench','khiva','nukus'
));
