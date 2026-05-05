# ---- Stage 1: Build ----
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# 先拷贝 pom 文件，利用 Docker 缓存加速依赖下载
COPY pom.xml .
COPY bootstrap/pom.xml bootstrap/
COPY framework/pom.xml framework/
COPY infra-ai/pom.xml infra-ai/
COPY mcp-server/pom.xml mcp-server/
RUN mvn dependency:go-offline -B || true

# 拷贝源码并构建
COPY . .
RUN mvn clean package -DskipTests -B -pl bootstrap -am

# ---- Stage 2: Run ----
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S knowflow && adduser -S knowflow -G knowflow

COPY --from=build /app/bootstrap/target/bootstrap-0.0.1-SNAPSHOT.jar app.jar

RUN chown -R knowflow:knowflow /app
USER knowflow

EXPOSE 9090

ENTRYPOINT ["java", \
  "-Xms256m", "-Xmx512m", "-Xss512k", \
  "-XX:+UseG1GC", \
  "-jar", "app.jar"]
