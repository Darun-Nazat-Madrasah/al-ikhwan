# আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ — হিসাব সফটওয়্যার v7

- প্রতিষ্ঠা: ২০২০
- আর্থিক হিসাব/কার্যক্রম: ২০২১ থেকে
- মাসিক সদস্য জমা: ৫০০ টাকা
- সবাই দেখতে পারবেন: সদস্যভিত্তিক মোট জমা ও মোট বাকি, জমার ইতিহাস, মোট লাভ, মোট খরচ, বার্ষিক ও মোট হিসাব, বর্তমান অবশিষ্ট ফান্ড।
- শুধু Admin দেখতে পারবেন: প্রত্যেক সদস্যের ব্যক্তিগত লাভ/ডিভিডেন্ড।
- লাভের হিসাব: ঐ বছরের সদস্যের মোট জমা ÷ ঐ বছরের মোট জমা × ঐ বছরের net profit.

## বর্তমান Supabase-এর সঙ্গে সামঞ্জস্য
Frontend এখন বিদ্যমান public views ব্যবহার করে: public_member_accounts, public_yearly_summary, public_all_years_summary, public_payment_history, public_notices।

Admin login Supabase Auth ব্যবহার করে এবং admin_users-এ role='admin' হলে Admin Panel খোলে।

## গুরুত্বপূর্ণ
`profits.total_profit`-এ **খরচ বাদ দেওয়ার পরের net/distributable profit** রাখবেন। তাহলে ব্যক্তিগত লাভের হিসাব সঠিক থাকবে।

`supabase-config.js`-এ শুধুমাত্র Publishable/Anon key ব্যবহার করবেন; service_role/secret key কখনো frontend-এ দেবেন না।
