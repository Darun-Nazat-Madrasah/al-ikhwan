# আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ — হিসাব সফটওয়্যার v7

এই সংস্করণে আপনার দেওয়া `organization-accounting-2021-2026.xlsx` ফাইলের সদস্য ও মাসিক জমার হিসাব যুক্ত করার জন্য প্রস্তুত করা হয়েছে।

## Excel থেকে যা যুক্ত হয়েছে
- ৩৪ জন সদস্য
- ২০২১, ২০২২, ২০২৩ ও ২০২৪ সালের ১২ মাসের হিসাব
- প্রতি মাসের required amount ও paid amount
- Excel-এর খালি মাসগুলোকে ০ টাকা জমা হিসেবে ধরা হয়েছে
- পুরোনো Bijoy/SutonnyMJ নামগুলো Unicode Bengali-তে রূপান্তর করা হয়েছে
- ২০২৫/২০২৬-এর কোনো worksheet/data আপনার দেওয়া workbook-এ পাওয়া যায়নি, তাই সেগুলো বানিয়ে দেওয়া হয়নি।

## Supabase-এ সেটআপের সঠিক ক্রম
1. Supabase → SQL Editor → `supabase-schema.sql` চালান।
2. তারপর একই SQL Editor-এ `seed-excel-data.sql` চালান।
3. `supabase-config.js`-এ আপনার Project URL ও Publishable/Anon Key রাখুন। Secret/service_role key কখনো এখানে দেবেন না।
4. GitHub Pages-এ `index.html`, `style.css`, `script.js`, `supabase-config.js`, `Al ikhwan logo.jpg` আপলোড করুন।
5. `excel-data.json` ব্যাকআপ হিসেবে রাখতে পারেন; ওয়েবসাইট চালাতে এটি বাধ্যতামূলক নয়।

## অ্যাডমিন চালু করার নিয়ম
Supabase Authentication-এ একটি Email/Password user তৈরি করুন। এরপর SQL Editor-এ সেই Auth user-এর UUID বসিয়ে:

insert into public.admin_users(user_id,role)
values('YOUR-AUTH-USER-UUID','admin')
on conflict(user_id) do update set role='admin';

এরপর ওয়েবসাইটের Admin অংশে সেই ইমেইল/পাসওয়ার্ড দিয়ে লগইন করলে সদস্য, মাসিক জমা, নেট লাভ, খরচ, বিনিয়োগ, সম্পদ/খাত ও নোটিশ সংরক্ষণ করা যাবে।

## বর্তমান ফান্ডের নিয়ম
বর্তমান ফান্ড = মোট সদস্য জমা + খরচ বাদ দেওয়া নেট লাভ − সক্রিয় সম্পদ/খাতে রাখা টাকা − সদস্য settlement।

`profits.total_profit`-এ শুধু খরচ বাদ দেওয়ার পরের **নেট লাভ** দিতে হবে, না হলে একই খরচ দুইবার বাদ যাবে।

## গুরুত্বপূর্ণ
এই সংস্করণে মাসিক সদস্য হিসাবের বিস্তারিত দেখা যায়। কোনো সদস্যের “মাসিক হিসাব” চাপলে বছর ও মাস অনুযায়ী জমা/বকেয়া দেখা যাবে।
