আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ — FINAL হিসাব ওয়েবসাইট

এই FINAL প্যাকেজটি আপনার আগের কাজের Supabase database/table এবং admin login-এর সাথে কাজ করার জন্য তৈরি।
ডিজাইনটি আপনি যে দারুন নাজাত ফলাফল ওয়েবসাইট দিয়েছেন তার UI/UX অনুসরণ করে নতুন করে সাজানো হয়েছে।

রাখা হয়েছে:
- প্রথমে সরাসরি “সদস্যদের ব্যক্তিগত হিসাব”
- ডান পাশ থেকে খোলা side menu
- Home অপশন নেই
- সকল সদস্যদের হিসাব
- বকেয়া লিস্ট
- অবশিষ্ট তহবিলের খাত
- নোটিশ
- Supabase Admin Login
- নতুন সদস্য, মাসিক জমা, লভ্যাংশ, খরচ, তহবিলের খাত, নোটিশ যোগ
- Edit/Delete management
- জমা ব্যবস্থাপনায় বছর নির্বাচন
- Print/PDF বাটন ফলাফলের নিচে
- মোবাইলে বড়, touch-friendly selection box
- বছরগুলো database data থেকে স্বয়ংক্রিয়ভাবে পাওয়া যায়

গুরুত্বপূর্ণ:
1. supabase-config.js-এ থাকা Publishable/Anon Key frontend-এ ব্যবহার করা হয়েছে।
2. service_role/secret key কখনো website-এ দেবেন না।
3. Supabase-এর বর্তমান table/RLS policy পরিবর্তন করার দরকার নেই যদি বর্তমান V8/V14 সিস্টেমে কাজ করে থাকে।
4. পুরোনো database seed SQL আবার চালাবেন না।
5. GitHub-এ এই FINAL প্যাকেজের সব ফাইল একসাথে upload করে পুরোনো website files replace করুন।

ফাইল:
- index.html
- style.css
- script.js
- supabase-config.js
- Al ikhwan logo.jpg
