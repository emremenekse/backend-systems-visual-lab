FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/DuplicatePayment.Provider/DuplicatePayment.Provider.csproj backend/DuplicatePayment.Provider/
RUN dotnet restore backend/DuplicatePayment.Provider/DuplicatePayment.Provider.csproj

COPY backend/DuplicatePayment.Provider/ backend/DuplicatePayment.Provider/
RUN dotnet publish backend/DuplicatePayment.Provider/DuplicatePayment.Provider.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "DuplicatePayment.Provider.dll"]
