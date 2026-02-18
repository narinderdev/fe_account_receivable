from pathlib import Path
paths = [
 ('src/app/pages/change-password/change-password.ts', [1,40,80,120,160]),
 ('src/app/pages/change-password/change-password.html', [1,40,80,120]),
 ('src/app/services/auth.service.ts', [1,40,80]),
 ('src/app/models/auth.model.ts', [1,60,120]),
 ('src/app/app.routes.ts', [1,40,120]),
 ('src/app/pages/dashboard/dashboard.ts', [1,40,120,160])
]
for path, markers in paths:
    text = Path(path).read_text().splitlines()
    print(path)
    for idx in markers:
        if 1 <= idx <= len(text):
            print(f"{idx}: {text[idx-1]}")
    print()
