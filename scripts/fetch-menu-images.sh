#!/bin/bash
# Sequential image fetching (slower but reliable)
TMPDIR=/home/z/my-project/scripts/tmp-imgs
mkdir -p "$TMPDIR"

declare -A QUERIES=(
  [coffee]="turkish coffee cup dark elegant cafe"
  [tea]="arabic tea glass mint hot drink"
  [espresso]="espresso coffee cappuccino latte cup"
  [icedcoffee]="iced coffee cold drink glass caramel"
  [matcha]="matcha green tea latte drink cup"
  [hotdrinks]="hot chocolate cinnamon milk drink cup"
  [juices]="fresh fruit juice orange glass colorful"
  [cocktails]="colorful cocktail mocktail drink tropical"
  [frappe]="frappe blended coffee whipped cream glass"
  [smoothie]="smoothie fresh fruit drink glass healthy"
  [mojito]="mojito mint lime drink glass refreshing"
  [milkshake]="milkshake chocolate vanilla glass whipped cream"
  [yogurt]="frozen yogurt smoothie drink cup fruit"
  [cans]="soda can soft drink pepsi cola"
  [energy]="energy drink can red bull"
  [popcorn]="popcorn bucket sweet caramel snack"
)

# Keep the existing espresso, hotdrinks
for key in coffee tea icedcoffee matcha juices cocktails frappe smoothie mojito milkshake yogurt cans energy popcorn; do
  if [ "$key" = "espresso" ] || [ "$key" = "hotdrinks" ]; then continue; fi
  size=$(wc -c < "$TMPDIR/$key.json" 2>/dev/null || echo 0)
  if [ "$size" -gt 500 ]; then
    echo "SKIP $key (already $size bytes)"
    continue
  fi
  echo "Fetching $key: ${QUERIES[$key]}"
  z-ai image-search -q "${QUERIES[$key]}" --count 10 --gl us --no-rank > "$TMPDIR/$key.json" 2>/dev/null
  echo "  -> $(wc -c < "$TMPDIR/$key.json") bytes"
done

# Parse
python3 <<'PYEOF'
import json, os, glob
TMPDIR = "/home/z/my-project/scripts/tmp-imgs"
result = {}
for path in sorted(glob.glob(os.path.join(TMPDIR, "*.json"))):
    key = os.path.splitext(os.path.basename(path))[0]
    try:
        with open(path) as f:
            data = f.read()
        # Find the JSON start
        idx = data.find('{')
        if idx == -1:
            print(f"{key}: no JSON found")
            continue
        json_str = data[idx:]
        d = json.loads(json_str)
        if d.get("success"):
            urls = [r.get("original_url", "") for r in d.get("results", []) if r.get("original_url")]
            if urls:
                result[key] = urls
                print(f"{key}: {len(urls)} images")
            else:
                print(f"{key}: no urls")
        else:
            print(f"{key}: success=false")
    except Exception as e:
        print(f"Error {key}: {e}")
with open("/home/z/my-project/scripts/menu-images.json", "w") as f:
    json.dump(result, f, indent=2)
print(f"\nTotal categories: {len(result)}")
PYEOF
