import os

file_path = r'd:\Projects\erp-system\install.php'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

search = 'runWithSpinner("mkdir -p storage/framework/views storage/framework/cache storage/framework/sessions storage/logs bootstrap/cache", "    -> Creating Storage Directories...");'
replace = '''runWithSpinner("mkdir -p storage/framework/views storage/framework/cache storage/framework/sessions storage/logs bootstrap/cache", "    -> Creating Storage Directories...");
runWithSpinner("cp -r public/images/Customizations storage/app/public/", "    -> Copying Default Customization Assets...");'''

content = content.replace(search, replace)

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Patched install.php.")