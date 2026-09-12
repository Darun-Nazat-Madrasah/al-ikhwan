# পুরোনো Excel → নতুন সফটওয়্যার Migration

এই ফোল্ডারে 2021–2025 Excel হিসাবকে নতুন database-এ নেওয়ার জন্য প্রস্তুত CSV আছে।

## গুরুত্বপূর্ণ
Excel-এর নামগুলো পুরোনো Bijoy/legacy encoding-এ আছে। তাই `members_import.csv`-এর `full_name_bn` কলামে সঠিক Unicode বাংলা নাম যাচাই করে বসাতে হবে। `member_code` অপরিবর্তিত রাখুন।

## ফাইল
- `members_import.csv` — সদস্য তালিকা; 34 জন নামসহ সদস্য শনাক্ত হয়েছে।
- `payments_import.csv` — 2021–2025-এর মাসিক জমার রেকর্ড।
- `yearly_data_check.csv` — Excel থেকে পড়া বছরভিত্তিক যাচাই রিপোর্ট।

## Import order
1. Supabase-এ `members` table তৈরি করুন (`schema.sql` ব্যবহার করে)।
2. `members_import.csv` থেকে member_code + full_name_bn + legacy_name তথ্য import করুন।
3. `payments_import.csv` থেকে payment data import করুন। Import-এর আগে member_code → member UUID mapping তৈরি করতে হবে।
4. Import শেষে yearly report-এর সাথে মোট জমা মিলিয়ে দেখুন।

**কোনো পুরোনো ডাটা delete করবেন না।** নতুন সফটওয়্যারে প্রতিটি মাস আলাদা payment row হিসেবে থাকবে।
