FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/DuplicatePayment.Api/DuplicatePayment.Api.csproj backend/DuplicatePayment.Api/
RUN dotnet restore backend/DuplicatePayment.Api/DuplicatePayment.Api.csproj

COPY backend/DuplicatePayment.Api/ backend/DuplicatePayment.Api/
RUN dotnet publish backend/DuplicatePayment.Api/DuplicatePayment.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "DuplicatePayment.Api.dll"]
