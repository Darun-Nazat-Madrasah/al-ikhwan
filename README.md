# আল ইহওয়ান ইসলামী সংস্থা বাংলাদেশ — অনলাইন হিসাব সফটওয়্যার

এটি একটি বাস্তব ব্যবহারযোগ্য responsive web app-এর ভিত্তি। Frontend: HTML/CSS/JavaScript. Backend/database/auth: Supabase free tier. Hosting: Cloudflare Pages / Netlify / GitHub Pages-এর মতো static hosting-এ ব্যবহার করা যাবে।

## 1) Supabase সেটআপ
1. একটি Supabase project খুলুন।
2. SQL Editor-এ `schema.sql` পুরোটা একবার চালান।
3. Authentication → Users থেকে একটি admin user (email/password) তৈরি করুন।
4. সেই user-এর UUID কপি করে SQL Editor-এ চালান:
   `insert into public.admin_users(user_id, display_name) values ('USER_UUID','Admin');`
5. Project Settings → API থেকে Project URL ও anon key নিন।
6. `config.example.js` কপি করে `config.js` বানান এবং দুইটি value বসান।

## 2) চালানো
Local testing-এর জন্য `python -m http.server 8080` চালিয়ে browser-এ `http://localhost:8080` খুলুন। অথবা সব ফাইল static hosting-এ upload করুন।

## 3) নিরাপত্তা
- ফোন/নোট/অন্যান্য গোপন member fields public view-তে নেই।
- Base tables RLS দ্বারা protected; write operation কেবল admin user করতে পারে।
- Admin password কখনও source code-এ রাখবেন না।
- Supabase dashboard-এ নিয়মিত database backup/export রাখুন।

## 4) হিসাবের নিয়ম
- মাসিক প্রাপ্য = settings-এর `monthly_due` (ডিফল্ট 500)।
- মাসিক জমা আলাদা row হিসেবে থাকে; বছর/মাস বদলালেও পুরোনো row মুছে যায় না।
- Lifetime entitled profit = member lifetime deposits / all members lifetime deposits × total profit.
- Annual report-এ year-wise profit/expense/investment entry দেখা হয়।
- “সকল বছর” মোডে সব বছরের যোগফল দেখানো হয়।

## 5) পুরোনো Excel ডেটা
`মাসিক হিসাব-2020-2025-New.xlsx`-এর 2021–2025 sheet-গুলোতে সদস্যভিত্তিক মাসিক তথ্য আছে। Migration করার আগে member names/IDs যাচাই করুন। Excel-এ নামগুলো Bijoy/legacy encoding-এ দেখা যাচ্ছে; import-এর আগে নামগুলো Unicode বাংলা করে যাচাই করা উচিত। `migration.py` একটি সহায়ক CSV তৈরির স্ক্রিপ্ট।

## 6) গুরুত্বপূর্ণ ব্যবসায়িক সিদ্ধান্ত
বকেয়া হিসাব বর্তমান active members × foundation-to-current months × monthly_due ভিত্তিতে হিসাব করা একটি সাধারণ default। কারও join date/নিষ্ক্রিয়তার কারণে আলাদা due rule প্রয়োজন হলে SQL view-টি পরিবর্তন করতে হবে। প্রতিষ্ঠার আগের opening balance বা 2020-এর সদস্যভিত্তিক তথ্য থাকলে তা আলাদা করে import/entry করা উচিত।

## 7) ভবিষ্যৎ উন্নতি
- সদস্যের ব্যক্তিগত detail page + print/PDF statement
- Excel import wizard
- audit log (কে কখন কী পরিবর্তন করেছে)
- monthly closing/approval
- automatic backup/export
- Bengali calendar/date formatting
- PWA/offline read-only cache

## 8) এই সংস্করণে পুরোনো Excel migration
`migration/` ফোল্ডারে 2021–2025-এর normalized CSV তৈরি করা হয়েছে। 34 জন নামসহ সদস্য শনাক্ত হয়েছে; Excel-এর কিছু অতিরিক্ত নম্বরের সারিতে নাম/জমা নেই, সেগুলো সদস্য হিসেবে import করা হয়নি। Legacy/Bijoy নাম স্বয়ংক্রিয়ভাবে ভুল বাংলা হয়ে যাওয়ার ঝুঁকি থাকায় `members_import.csv`-এ Unicode নাম যাচাই করে পূরণ করতে হবে।
