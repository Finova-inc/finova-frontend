# -*- coding: utf-8 -*-
import io, base64
src = io.open('feat.b64', encoding='ascii').read()
data = base64.b64decode(src).decode('utf-8')
io.open('components/landing/FeaturesSection.tsx', 'w', encoding='utf-8').write(data)
print('escrito, bytes:', len(data))
