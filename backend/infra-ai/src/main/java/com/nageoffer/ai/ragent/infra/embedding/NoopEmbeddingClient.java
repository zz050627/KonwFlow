/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.nageoffer.ai.ragent.infra.embedding;

import com.nageoffer.ai.ragent.infra.enums.ModelProvider;
import com.nageoffer.ai.ragent.infra.model.ModelTarget;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class NoopEmbeddingClient implements EmbeddingClient {

    private static final int DEFAULT_DIM = 1536;

    @Override
    public String provider() {
        return ModelProvider.NOOP.getId();
    }

    @Override
    public List<Float> embed(String text, ModelTarget target) {
        return embedBatch(List.of(text), target).get(0);
    }

    @Override
    public List<List<Float>> embedBatch(List<String> texts, ModelTarget target) {
        int dim = resolveDimension(target);
        List<List<Float>> out = new ArrayList<>(texts == null ? 0 : texts.size());
        if (texts == null || texts.isEmpty()) {
            return out;
        }
        for (String text : texts) {
            float[] vec = hashEmbedding(text == null ? "" : text, dim);
            List<Float> row = new ArrayList<>(dim);
            for (float v : vec) {
                row.add(v);
            }
            out.add(row);
        }
        return out;
    }

    private int resolveDimension(ModelTarget target) {
        if (target != null && target.candidate() != null && target.candidate().getDimension() != null) {
            Integer d = target.candidate().getDimension();
            if (d != null && d > 0) {
                return d;
            }
        }
        return DEFAULT_DIM;
    }

    private float[] hashEmbedding(String text, int dim) {
        float[] vec = new float[dim];
        List<String> tokens = tokenize(text);
        for (String token : tokens) {
            int idx = floorMod(fnv1a32(token), dim);
            vec[idx] += 1.0f;
        }
        l2Normalize(vec);
        return vec;
    }

    private List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        StringBuilder buf = new StringBuilder();
        int len = text.length();
        for (int i = 0; i < len; ) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            if (isAsciiWord(cp)) {
                buf.appendCodePoint(Character.toLowerCase(cp));
                continue;
            }
            if (buf.length() > 0) {
                tokens.add(buf.toString());
                buf.setLength(0);
            }
            if (isCjk(cp)) {
                tokens.add(new String(Character.toChars(cp)));
            }
        }
        if (buf.length() > 0) {
            tokens.add(buf.toString());
        }
        return tokens;
    }

    private boolean isAsciiWord(int cp) {
        return (cp >= 'a' && cp <= 'z')
                || (cp >= 'A' && cp <= 'Z')
                || (cp >= '0' && cp <= '9');
    }

    private boolean isCjk(int cp) {
        return (cp >= 0x4E00 && cp <= 0x9FFF)
                || (cp >= 0x3400 && cp <= 0x4DBF)
                || (cp >= 0xF900 && cp <= 0xFAFF);
    }

    private int fnv1a32(String s) {
        int hash = 0x811c9dc5;
        byte[] bytes = s.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        for (byte b : bytes) {
            hash ^= (b & 0xff);
            hash *= 0x01000193;
        }
        return hash;
    }

    private int floorMod(int x, int m) {
        int r = x % m;
        return r < 0 ? r + m : r;
    }

    private void l2Normalize(float[] vec) {
        double sum = 0.0;
        for (float v : vec) {
            sum += (double) v * (double) v;
        }
        double norm = Math.sqrt(sum);
        if (norm <= 0.0) {
            return;
        }
        float scale = (float) (1.0 / norm);
        for (int i = 0; i < vec.length; i++) {
            vec[i] *= scale;
        }
    }
}
