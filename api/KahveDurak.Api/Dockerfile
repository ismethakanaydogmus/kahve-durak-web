# Build context: api/
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY KahveDurak.Api/KahveDurak.Api.csproj KahveDurak.Api/
RUN dotnet restore KahveDurak.Api/KahveDurak.Api.csproj
COPY KahveDurak.Api/ KahveDurak.Api/
RUN dotnet publish KahveDurak.Api/KahveDurak.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
# Render provides PORT; default to 8080 elsewhere.
ENV PORT=8080
CMD ["sh", "-c", "ASPNETCORE_HTTP_PORTS=${PORT} exec dotnet KahveDurak.Api.dll"]
